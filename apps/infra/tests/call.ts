/**
 * Call the API Gateway endpoint
 */

export async function call() {
    const response = await fetch("https://24rsm33lk5.execute-api.eu-central-1.amazonaws.com/dev/orchestrator/Multiverse-Test");
    const body = await response.json() as { message: string, id: string };
    return body;
}

(async() => {
    console.time("call");
    const result = await call();
    console.timeEnd("call");
    console.log(result);
})();