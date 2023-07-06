import { callLambda, getLambdas } from "../src/CloudFormationManager";

describe("CloudFormation manager", () => {
    it("getLambdas", async() => {
        const lambdas = await getLambdas("Multiverse-Test");

        console.log(lambdas);
    });

    it("calls", async() => {
        const lambdas = await getLambdas("Multiverse-Test");

        const result = await callLambda(lambdas[0], { test: "test" });

        console.log(result);
    });
});