/**
 * This is a test runtime for super lambda functions.
 * Do not forget to zip the function if updated.
 */

const id = Math.random();

let errorSettings = {
    failed: 0,
    toFail: 0,
    time: 0
};

const handler = async(event, context) => {

    // wait
    if (event.path === "/wait") {
        const time = JSON.parse(event.body).time;
        await new Promise(resolve => setTimeout(resolve, time));
    }

    // simulate error/network timeout
    if (event.path === "/setup-error") {
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        const fnName = process.env.AWS_LAMBDA_FUNCTION_NAME;
        const body = JSON.parse(event.body);

        if (body.errorSettings[fnName])
            errorSettings = body.errorSettings[fnName];
        else
            throw new Error("No error settings for this function");
    }

    if (event.path === "/test-error") {
        if (errorSettings.failed < errorSettings.toFail) {
            errorSettings.failed++;
            await new Promise(resolve => setTimeout(resolve, errorSettings.time));
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
            errorSettings
        }),
    };
};

module.exports = { handler };