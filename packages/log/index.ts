import type { ILogObj } from "tslog";
import { Logger } from "tslog";

const log: Logger<ILogObj> = new Logger({
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    stylePrettyLogs: process.env.AWS_LAMBDA_FUNCTION_NAME ? false : true,
    // minLevel: process.env.NODE_ENV === "production" ? 3 : 0,
});

// https://tslog.js.org/#/?id=simple-example

export default log;