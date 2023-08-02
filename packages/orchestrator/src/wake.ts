import { Lambda } from "@aws-sdk/client-lambda";

const lambda = new Lambda({});

/**
 *
 * @param functionArn
 * @param awakeInstances
 * @returns instance ids of the woken instances
 */
export default async function wake(functionArn: string, awakeInstances: number): Promise<string[]> {

    let results = [];

    for (let i = 0; i < awakeInstances; i++) {
        results.push(lambda.invoke({
            FunctionName: functionArn,
            InvocationType: "RequestResponse",
            Payload: JSON.stringify({
                httpMethod: "POST",
                path: "/wait",
                body: JSON.stringify({ time: 200 })
            })
        }));
    }

    results = await Promise.all(results);

    return results.map(result => JSON.parse(Buffer.from(result.Payload || "").toString()).instanceId);
}