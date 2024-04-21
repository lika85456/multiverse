import { router } from "@/server/trpc";
import { database, } from "@/server/procedures/database";
import { statistics, } from "@/server/procedures/statistics";
import { awsToken } from "@/server/procedures/awsToken";
import log from "@multiverse/log";
import { TRPCError } from "@trpc/server";

/**
 * Generate a random hex string of a given length
 * @param length
 */
export function generateHex(length: number): string {
    let result = "";
    const hexCharacters = "0123456789abcdef";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * hexCharacters.length);
        result += hexCharacters.charAt(randomIndex);
    }

    return result;
}

/**
 * Handle errors and log them. Required errorMessage is used to hide internal error messages.
 * Errors have their messages logged and are rethrown as TRPCError with message as errorMessage.
 * If logMessage is provided, it is logged as well.
 * Otherwise, a generic error is thrown.
 * @param error - error to be compared and handled
 * @param errorMessage - unspecific message, used to hide internal error messages
 * @param logMessage - specific message to be logged (otherwise error is logged)
 */
export const handleError = ({
    error, logMessage, errorMessage
}: {
        error: unknown,
        logMessage?: string
        errorMessage: string
    }) => {
    let throwee: TRPCError;

    // type-check error and set correct throwee
    // TODO - add parsing multiverse and other errors
    if (error instanceof TRPCError) {
        throwee = error;
    } else if (error instanceof Error) {
        throwee = new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
        });
    } else {
        throwee = new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unknown error occurred",
        });
    }

    // also log the logMessage if specified
    if (logMessage) {
        // log logMessage if provided too
        log.error(logMessage);
    }
    log.error(throwee.message); // log error message

    // hide internal error message
    throwee.message = errorMessage;

    // throw the throwee
    return throwee;
};

export const appRouter = router({
    database,
    statistics,
    awsToken
});

export type AppRouter = typeof appRouter;