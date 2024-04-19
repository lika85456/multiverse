import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import {
    addQueueToUser, getSessionUser, removeQueueFromUser
} from "@/lib/mongodb/collections/user";
import {
    addAwsToken, getAwsTokenByAccessKeyId,
    getAwsTokenByOwner,
    removeAwsToken,
} from "@/lib/mongodb/collections/aws-token";
import { deleteAllDatabases } from "@/lib/mongodb/collections/database";
import { TRPCError } from "@trpc/server";
import { MultiverseFactory } from "@/server/multiverse-interface/MultiverseFactory";
import { SQSHandler } from "@/features/statistics/statistics-processor/SQSHandler";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import log from "@multiverse/log";
import { handleError } from "@/server";

/**
 * Check if the AWS credentials are valid by calling the STS service
 * @param accessKeyId
 * @param secretAccessKey
 */
const checkAwsCredentials = async(accessKeyId: string, secretAccessKey: string) => {
    try {
        const client = new STSClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey
            }
        });
        const command = new GetCallerIdentityCommand();
        const result = await client.send(command);
        if (!result.Account || !result.UserId) {
            throw new Error("Result does not contain Account or UserId");
        }
    } catch (error) {
        log.error(error);
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid AWS Token, could not connect to AWS account"
        });
    }
};

export const awsToken = router({
    /**
     * Get the aws token of the user.
     * If the token does not exist, null is returned
     * @returns {accessKeyId: string, ownerId: string} - the aws token
     * @returns {null} - if the token does not exist
     */
    get: publicProcedure.query(async() => {
        const user = await getSessionUser();
        if (!user) {
            log.error("User not found");
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "User not found",
            });
        }

        try {
            // get aws token from mongodb
            const awsToken = await getAwsTokenByOwner(user._id);
            if (!awsToken) {
                log.debug(`AWS Token not found for user: ${user.email}`);

                return null;
            }
            log.debug(`AWS Token found for user: ${user.email} with accessKeyId ${awsToken.accessKeyId}`);

            return {
                accessKeyId: awsToken.accessKeyId,
                // secretAccessKey: awsToken.secretAccessKey, // do not return on frontend
                ownerId: awsToken.ownerId,
            };
        } catch (error) {
            throw handleError({
                error,
                logMessage: `Error getting AWS token for user ${user.email}`,
                errorMessage: "Error getting AWS token"
            });
        }
    }),
    /**
     * Add the aws token to the user. Token is stored into the mongodb
     * @param accessKeyId - the access key id of the aws token
     * @param secretAccessKey - the secret access key of the aws token
     */
    post: publicProcedure
        .input(z.object({
            accessKeyId: z.string(),
            secretAccessKey: z.string(),
        }),)
        .mutation(async(opts) => {
            try {
                // get user
                const sessionUser = await getSessionUser();
                if (!sessionUser) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "Cannot add AWS Token, user not found",
                    });
                }
                log.info("Adding AWS Token to user: ", sessionUser.email);

                // check if token already exists
                const existingToken = await getAwsTokenByAccessKeyId(opts.input.accessKeyId);
                if (existingToken) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: `Cannot add AWS token ${opts.input.accessKeyId} to user ${sessionUser.email}, token already exists`,
                    });
                }

                // check AWS Credentials
                await checkAwsCredentials(opts.input.accessKeyId, opts.input.secretAccessKey);

                // store token in mongodb
                await addAwsToken({
                    accessKeyId: opts.input.accessKeyId,
                    secretAccessKey: opts.input.secretAccessKey,
                    ownerId: sessionUser._id,
                });

                // create a queue for the user
                const statisticsProcessor = new SQSHandler();
                const queueName = await statisticsProcessor.createQueue();

                // store queue in mongodb
                await addQueueToUser(sessionUser._id, queueName);
                log.info("Created SQS Queue with name: ", queueName);
            } catch (error) {
                throw handleError({
                    error,
                    errorMessage: "Error adding AWS token"
                });
            }
        }),
    /**
     * Remove the aws token from the user.
     * Complete cleanup will start. This will delete all databases in the multiverse and mongodb
     * @returns {boolean} - true if the token is removed and all databases are deleted
     */
    delete: publicProcedure.mutation(async() => {
        try {
            // get user
            const sessionUser = await getSessionUser();
            if (!sessionUser) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Cannot delete AWS Token, user not found",
                });
            }
            log.debug(`Deleting AWS token for user ${sessionUser.email}`);

            // delete queue from AWS and mongodb
            const statisticsProcessor = new SQSHandler();
            await statisticsProcessor.deleteQueue();
            await removeQueueFromUser(sessionUser._id);

            // delete all databases in the mongodb
            await deleteAllDatabases(sessionUser._id);

            // delete all databases in the multiverse
            const multiverse = await (new MultiverseFactory()).getMultiverse();
            const databases = await multiverse.listDatabases();
            await Promise.all(databases.map(async(database) => {
                await multiverse.removeDatabase((await database.getConfiguration()).name);
            }));

            // delete aws token from mongodb
            await removeAwsToken(sessionUser._id);
            log.info(`AWS token deleted for user ${sessionUser.email}`);
        } catch (error) {
            throw handleError({
                error,
                errorMessage: "Error deleting AWS token"
            });
        }
    }),
});