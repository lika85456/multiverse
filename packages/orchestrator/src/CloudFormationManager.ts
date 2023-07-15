import type { StackResourceSummary } from "@aws-sdk/client-cloudformation";
import { CloudFormation } from "@aws-sdk/client-cloudformation";
import { Lambda } from "@aws-sdk/client-lambda";

const cloudFormation = new CloudFormation({ region: "eu-central-1" });
const lambda = new Lambda({ region: "eu-central-1" });

// get all lambdas from cloud formation with id STACK_ID
export async function getLambdas(stackName: string) {
    const lambdas = await cloudFormation.listStackResources({ StackName: stackName });

    if (!lambdas.StackResourceSummaries) throw new Error("No lambdas (resources) found in stack " + stackName);

    return lambdas.StackResourceSummaries.filter((resource) => (resource.ResourceType === "AWS::Lambda::Function") && (!resource.LogicalResourceId?.includes("Orchestrator") || !resource.LogicalResourceId?.includes("CustomS3AutoDeleteObjectsCustomRes")));
}

export async function callLambda({ stackResourcesSummary, payload }: { stackResourcesSummary: StackResourceSummary; payload: any; }) {
    const result = await lambda.invoke({
        FunctionName: stackResourcesSummary.PhysicalResourceId,
        Payload: JSON.stringify(payload)
    });

    if (!result.Payload) {
        throw new Error("No payload returned from lambda");
    }

    return {
        ...result,
        Payload: result.Payload.transformToString()
    };
}