import { generateErrorMessage } from "zod-error";
import type { ZodIssue } from "zod";

export function prettifyIssues(issues: ZodIssue[]) {
    if (issues && issues.length > 0) {
        console.error("Invalid environment variables, check the errors below!");
        console.error(generateErrorMessage(issues, { delimiter: { error: "\\n" }, }));
        throw new Error("Invalid environment variables!");
    }

    console.log("The environment variables are valid!");
}