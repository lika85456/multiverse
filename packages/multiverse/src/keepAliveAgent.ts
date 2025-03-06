import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { Agent } from "https";

export default new NodeHttpHandler({
    httpsAgent: new Agent({
        keepAlive: true,
        maxSockets: 900,
    }),
    requestTimeout: 10000
});