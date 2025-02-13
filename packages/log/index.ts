/* eslint-disable turbo/no-undeclared-env-vars */
import type { ILogObj } from "tslog";
import { Logger } from "tslog";

const log: Logger<ILogObj> = new Logger({
    stylePrettyLogs: process.env.AWS_LAMBDA_FUNCTION_NAME ? false : true,
    // minLevel: process.env.NODE_ENV === "production" ? 3 : 0,
    // 0: silly, 1: trace, 2: debug, 3: info, 4: warn, 5: error, 6: fatal
    minLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : 0,
});

// https://tslog.js.org/#/?id=simple-example

export default log;