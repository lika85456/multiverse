import { getLambdas, callLambda } from "../src/CloudFormationManager";

describe.skip("CloudFormation manager", () => {
    it("getLambdas", async() => {
        const lambdas = await getLambdas("Multiverse-Test");

        console.log(lambdas);
    });

    it("calls", async() => {
        const lambdas = await getLambdas("Multiverse-Test");

        const result = await callLambda({
            stackResourcesSummary: lambdas[0],
            payload: { test: "test" }
        });

        console.log(result);
    });
});