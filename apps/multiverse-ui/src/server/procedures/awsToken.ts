import { publicProcedure, router } from "@/server/trpc";
import z from "zod";
import {
    addQueueToUser, changeUserAcceptedCostsGeneration, getSessionUser, removeQueueFromUser
} from "@/lib/mongodb/collections/user";
import {
    addAwsToken, getAwsTokenByAccessKeyId,
    getAwsTokenByOwner,
    removeAwsToken,
} from "@/lib/mongodb/collections/aws-token";
import { deleteAllDatabases } from "@/lib/mongodb/collections/database";
import { TRPCError } from "@trpc/server";
import { MultiverseFactory } from "@/lib/multiverse-interface/MultiverseFactory";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import log from "@multiverse/log";
import { generateHex, handleError } from "@/server";
import SQSSStatisticsQueue from "@multiverse/multiverse/src/StatisticsQueue/SQSStatisticsQueue";

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
                const awsTokenResult = await addAwsToken({
                    accessKeyId: opts.input.accessKeyId,
                    secretAccessKey: opts.input.secretAccessKey,
                    ownerId: sessionUser._id,
                });

                const queueName = `multiverse-${awsTokenResult._id}-${generateHex(8)}`;
                // create a queue for the user
                const sqs = new SQSSStatisticsQueue({
                    region: "eu-central-1",
                    queueName: sessionUser.sqsQueue,
                    awsToken: {
                        accessKeyId: opts.input.accessKeyId,
                        secretAccessKey: opts.input.secretAccessKey
                    }
                });
                await sqs.deploy({ queueName: queueName });

                // store queue in mongodb
                await addQueueToUser(sessionUser._id, queueName);

                // disable cost generation by default
                await changeUserAcceptedCostsGeneration(sessionUser._id, false);
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

            const awsToken = await getAwsTokenByOwner(sessionUser._id);
            if (!awsToken) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "AWS Token not found",
                });
            }

            // delete queue from AWS and mongodb (user with aws token should have a queue)
            if (sessionUser.sqsQueue) {
                log.debug(`Deleting AWS token for user ${sessionUser.email}`);
                const sqs = new SQSSStatisticsQueue({
                    region: "eu-central-1",
                    queueName: sessionUser.sqsQueue,
                    awsToken: {
                        accessKeyId: awsToken.accessKeyId,
                        secretAccessKey: awsToken.secretAccessKey
                    }
                });
                await sqs.destroy();

                await removeQueueFromUser(sessionUser._id);
            } else {
                log.warn(`No SQS queue found for user ${sessionUser.email} at deletion of AWS token.`);
            }

            // delete all databases in the mongodb
            await deleteAllDatabases(sessionUser._id);

            // delete all databases in the multiverse
            const multiverse = await (new MultiverseFactory()).getMultiverse();
            await multiverse.destroySharedInfrastructure();

            // delete aws token from mongodb
            await removeAwsToken(sessionUser._id);

            // disable cost generation
            await changeUserAcceptedCostsGeneration(sessionUser._id, false);
            log.info(`AWS token deleted for user ${sessionUser.email}`);
        } catch (error) {
            throw handleError({
                error,
                errorMessage: "Error deleting AWS token"
            });
        }
    }),
});