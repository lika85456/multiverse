import { StackContext, Api, EventBus } from "sst/constructs";

export function API({ stack }: StackContext) {

  const api = new Api(stack, "api", {
    accessLog: {
      retention: "one_week",
    },
    routes: {
      "GET /notes": {
        function: {
          handler: "packages/functions/src/lambda.handler",
          timeout: 50,
          environment: { G:"x" },
        },
      },
    }
  });

  api.attachPermissions(["s3"]);

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
