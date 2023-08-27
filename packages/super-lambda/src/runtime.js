/**
 * This is a test runtime.
 */

const id = Math.random();

const coldStartPromise = new Promise(resolve => setTimeout(resolve, 1000));

const handler = async(event, context) => {

    // cold start
    await coldStartPromise;

    // wait
    if (event.path === "/wait") {
        const time = JSON.parse(event.body).time;
        await new Promise(resolve => setTimeout(resolve, time));
    }

    // simulate error/network timeout
    if (event.path === "/timeout") {
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        const fnName = process.env.AWS_LAMBDA_FUNCTION_NAME;
        const body = JSON.parse(event.body);

        if (body.errorSettings[fnName]) {
            const time = body.errorSettings[fnName].time ?? 0;
            await new Promise(resolve => setTimeout(resolve, time));
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: "Hello from Super Lambda!",
            event,
            context,
            id,
            // eslint-disable-next-line turbo/no-undeclared-env-vars
            name: process.env.AWS_LAMBDA_FUNCTION_NAME,
        }),
    };
};

module.exports = { handler };