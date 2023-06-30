import { Lambda as AWSLambda } from "@aws-sdk/client-lambda";

const lambda = new AWSLambda({ region: "eu-central-1" });

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// /**
//  * Creates a lambda function from a zip file
//  * @param codeZipPath path to the zip file containing the lambda code
//  * @returns the ARN of the created lambda function
//  */
// export async function createLambda(codeZip: Uint8Array, name: string): Promise<string> {

//     const result = await lambda.createFunction({
//         Code: { ZipFile: codeZip },
//         FunctionName: name,
//         Handler: "index.handler",
//         Role: "arn:aws:iam::529734186765:role/deployer",
//         Runtime: "nodejs18.x",
//         EphemeralStorage: { Size: 512 },
//         MemorySize: 256,
//         Timeout: 900,
//     });

//     console.info(`Created new lambda function: ${result}`);

//     if (!result.FunctionArn) {
//         throw new Error("No ARN returned from lambda creation");
//     }

//     let state = result.State;

//     while(state==="Pending") {
//         await sleep(1000);
//         const status = await lambda.getFunction({ FunctionName: name });
//         state = status.Configuration?.State;
//     }

//     return result.FunctionArn;
// }

// export async function deleteLambda(name: string): Promise<void> {
//     await lambda.deleteFunction({ FunctionName: name });
// }

export type Region = "eu-central-1" | "us-east-1";

export type MemorySize = 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 10240;

export type LambdaConfig = {
    region: Region;
    memorySize: MemorySize;
    ephemeralStorageSize: MemorySize;
    timeout: number;
    name: string;
    codeZipPath: string;
};

export default class Lambda {
    constructor(private readonly config: LambdaConfig) {

    }

    public async exists(): Promise<boolean> {
        try {
            await lambda.getFunction({ FunctionName: this.config.name });
            return true;
        } catch {
            return false;
        }
    }

    public async create(): Promise<void> {
        const result = await lambda.createFunction({
            Code: {  },
            FunctionName: this.config.name,
            Handler: "index.handler",
            Role: "arn:aws:iam::529734186765:role/deployer",
            Runtime: "nodejs18.x",
            EphemeralStorage: { Size: this.config.ephemeralStorageSize },
            MemorySize: this.config.memorySize,
            Timeout: this.config.timeout,
        });

        console.info(`Created new lambda function: ${result}`);

        if (!result.FunctionArn) {
            throw new Error("No ARN returned from lambda creation");
        }

        let state = result.State;

        while(state==="Pending") {
            await sleep(1000);
            const status = await lambda.getFunction({ FunctionName: this.config.name });
            state = status.Configuration?.State;
        }
    }
}