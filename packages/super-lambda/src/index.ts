import type { CreateFunctionCommandInput, InvokeCommandOutput } from "@aws-sdk/client-lambda";
import { Lambda } from "@aws-sdk/client-lambda";
import { DynamoDB } from "@aws-sdk/client-dynamodb";

export type SuperLambdaConfig = {
    mainRegion: string;
    mainRegionFallbacks: number;
    secondaryRegions: string[];
    name: string;
    // awaking should not be a responsibility of SuperLambda, since it's not a
    // concern of the lambda itself. It's a concern of the orchestrator.
    // awakeInstances: number;
};

type SuperLambdaInstanceState = {
    state: "active" | "updating";
    name: string;
    region: string;
};

export default class SuperLambda {

    constructor(private config: SuperLambdaConfig) {
    }

    public async functions() {
        const states = await this.getStates();

        return states
            .sort((a, b) => {
                if (a.region === this.config.mainRegion && b.region !== this.config.mainRegion) {
                    return -1;
                }

                if (a.region !== this.config.mainRegion && b.region === this.config.mainRegion) {
                    return 1;
                }

                return a.name.localeCompare(b.name);
            });
    }

    public async invoke(event: Record<string, unknown>, options?: {
        maxRetries?: number;
        maxTimeout?: number;
        retry?: number;
        fallbacks?: number;
    }): Promise<InvokeCommandOutput & {
        fallbacks: number;
    }> {
        console.debug(`Invoking ${this.config.name} try: ${options?.retry ?? 0}`);

        const states = await this.getStates();

        const activeStates = states.filter(state => state.state === "active")
            .sort((a, b) => {
                if (a.region === this.config.mainRegion && b.region !== this.config.mainRegion) {
                    return -1;
                }

                if (a.region !== this.config.mainRegion && b.region === this.config.mainRegion) {
                    return 1;
                }

                return a.region.localeCompare(b.region);
            });

        const maxRetries = options?.maxRetries ?? 5;
        const retry = options?.retry ?? 0;
        const canRetry = retry < maxRetries;
        let fallbacks = options?.fallbacks ?? 0;

        if (activeStates.length === 0 && canRetry) {
            console.debug("No active instances found, retrying");
            await new Promise(resolve => setTimeout(resolve, 50));
            const result = await this.invoke(event, {
                ...options,
                retry: retry + 1
            });

            return {
                ...result,
                fallbacks: result.fallbacks + 1
            };
        }

        if (activeStates.length === 0 && !canRetry) {
            throw new Error("No active instances found");
        }

        const maxTimeout = options?.maxTimeout ?? 500;

        // start invoking first active instance and after maxTimeout invoke the next one
        for (const activeFn of activeStates) {
            console.debug(`Invoking physical function ${activeFn.name} in region ${activeFn.region}`);
            const result = await Promise.any([
                this.invokeFunction(activeFn.name, activeFn.region, event),
                new Promise((resolve) => setTimeout(() => resolve(new Error("Timeout")), maxTimeout))
            ]);

            if (result instanceof Error) {
                console.debug(`Invocation of ${activeFn.name} timed out`);
                fallbacks++;
                continue;
            }

            return {
                ...(result as InvokeCommandOutput),
                fallbacks
            };
        }

        if (canRetry) {
            return await this.invoke(event, {
                ...options,
                retry: retry + 1
            });
        }

        throw new Error("No active instances found");
    }

    private async invokeFunction(functionName: string, region: string, event: Record<string, unknown>) {
        const lambda = new Lambda({ region });

        return await lambda.invoke({
            FunctionName: functionName,
            InvocationType: "RequestResponse",
            Payload: JSON.stringify(event)
        });
    }

    public async deploy(input: Omit<CreateFunctionCommandInput, "FunctionName">) {

        await this.createStateTable();

        const mainFunctions = new Array(this.config.mainRegionFallbacks + 1).fill(0).map((_, i) => {
            return this.createFunction({
                ...input,
                FunctionName: `${this.config.name}-m${i}`
            }, this.config.mainRegion);
        });

        const secondaryFunctions = this.config.secondaryRegions.map(region => {
            return this.createFunction({
                ...input,
                FunctionName: `${this.config.name}-${region}`
            }, region);
        });

        await Promise.all([...mainFunctions, ...secondaryFunctions]);
    }

    public async destroy() {
        await Promise.all(new Array(this.config.mainRegionFallbacks + 1).fill(0).map((_, i) => {
            return this.destroyFunction(`${this.config.name}-m${i}`, this.config.mainRegion);
        }));

        await Promise.all(this.config.secondaryRegions.map(region => {
            return this.destroyFunction(`${this.config.name}-${region}`, region);
        }));

        await this.destroyTable();
    }

    // TODO update function configuration, update function code

    private async createFunction(input: CreateFunctionCommandInput, region: string) {
        console.debug(`Creating function ${input.FunctionName}`);

        const lambda = new Lambda({ region });
        const result = await lambda.createFunction(input);

        console.debug(`Function ${input.FunctionName} created`);

        let functionState = await lambda.getFunction({ FunctionName: input.FunctionName });
        while (functionState.Configuration?.State !== "Active") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            functionState = await lambda.getFunction({ FunctionName: input.FunctionName });

            if (functionState.Configuration?.State === "Failed") {
                throw new Error("Function creation failed");
            }

            console.debug(`Function ${input.FunctionName} state: ${functionState.Configuration?.State}`);
        }

        if (!input.FunctionName) {
            throw new Error("FunctionName is required");
        }

        await this.updateState(input.FunctionName, {
            name: input.FunctionName,
            region,
            state: "active"
        });

        return result.FunctionArn;
    }

    private async destroyFunction(name: string, region: string) {
        console.debug(`Destroying function ${name}`);

        const lambda = new Lambda({ region });
        await lambda.deleteFunction({ FunctionName: name });

        console.debug(`Function ${name} destroyed`);
    }

    private async getStates(): Promise<SuperLambdaInstanceState[]> {
        const dynamo = new DynamoDB({ region: this.config.mainRegion });

        const result = await dynamo.scan({ TableName: `${this.config.name}-state` });

        return (result.Items || []).map(item => {
            return {
                name: item.name.S || "",
                region: item.region.S || "",
                state: (item.state.S || "updating") as "active" | "updating"
            };
        });
    }

    private async updateState(functionName: string, state: SuperLambdaInstanceState) {
        const dynamo = new DynamoDB({ region: this.config.mainRegion });

        await dynamo.putItem({
            TableName: `${this.config.name}-state`,
            Item: {
                name: { S: functionName },
                region: { S: state.region },
                state: { S: state.state }
            }
        });
    }

    private async createStateTable() {
        console.debug(`Creating state table ${this.config.name}-state`);

        const dynamo = new DynamoDB({ region: this.config.mainRegion });

        await dynamo.createTable({
            TableName: `${this.config.name}-state`,
            AttributeDefinitions: [
                {
                    AttributeName: "name",
                    AttributeType: "S"
                },
                {
                    AttributeName: "region",
                    AttributeType: "S"
                }
            ],
            KeySchema: [
                {
                    AttributeName: "name",
                    KeyType: "HASH"
                },
                {
                    AttributeName: "region",
                    KeyType: "RANGE"
                }
            ],
            BillingMode: "PAY_PER_REQUEST"
        });

        let state = (await dynamo.describeTable({ TableName: `${this.config.name}-state` })).Table?.TableStatus;
        while (state !== "ACTIVE") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            state = (await dynamo.describeTable({ TableName: `${this.config.name}-state` })).Table?.TableStatus;

            if (state === "FAILED") {
                throw new Error("State table creation failed");
            }

            console.debug(`State table ${this.config.name}-state state: ${state}`);
        }
    }

    private async destroyTable() {
        console.debug(`Destroying state table ${this.config.name}-state`);

        const dynamo = new DynamoDB({ region: this.config.mainRegion });

        await dynamo.deleteTable({ TableName: `${this.config.name}-state` });

        console.debug(`State table ${this.config.name}-state destroyed`);
    }
}