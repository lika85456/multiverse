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

export const awsToken = router({
    /**
     * Get the aws token of the user.
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

    }),
    /**
     * Add the aws token to the user. Token is stored into the mongodb
     */
    post: publicProcedure
        .input(z.object({
            accessKeyId: z.string(),
            secretAccessKey: z.string(),
        }),)
        .mutation(async(opts) => {
            const sessionUser = await getSessionUser();
            if (!sessionUser) {
                log.error("Cannot add AWS Token, user not found");
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Cannot add AWS Token, user not found",
                });
            }
            log.info("Adding AWS Token to user: ", sessionUser.email);

            const existingToken = await getAwsTokenByAccessKeyId(opts.input.accessKeyId);
            if (existingToken) {
                log.error(`Cannot add AWS token ${opts.input.accessKeyId}, token already exists`);
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Token already exists"
                });
            }

            // check AWS Credentials
            try {
                const client = new STSClient({
                    region: "eu-central-1",
                    credentials: {
                        accessKeyId: opts.input.accessKeyId,
                        secretAccessKey: opts.input.secretAccessKey
                    }
                });
                const command = new GetCallerIdentityCommand();
                const result = await client.send(command);
                if (!result.Account || !result.UserId) {
                    throw new Error();
                }
            } catch (error) {
                log.error("Error connecting to AWS account: ", error);
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Invalid AWS Token, could not connect to AWS account"
                });
            }

            // store token in mongodb
            const awsToken = await addAwsToken({
                accessKeyId: opts.input.accessKeyId,
                secretAccessKey: opts.input.secretAccessKey,
                ownerId: sessionUser._id,
            });
            if (!awsToken) {
                log.error("Error adding token to database");
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error adding token to database"
                });
            }

            // create a queue for the user
            const statisticsProcessor = new SQSHandler();
            const queueName = await statisticsProcessor.createQueue();

            // store queue in mongodb
            const result = await addQueueToUser(queueName);
            if (!result) {
                log.error("Error adding queue to user");
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Error adding queue to user"
                });
            }
            log.info("Created SQS Queue with name: ", queueName);

            return awsToken;
        }),
    /**
     * Remove the aws token from the user.
     * Complete cleanup will start. This will delete all databases in the multiverse and mongodb
     * @returns {boolean} - true if the token is removed and all databases are deleted
     */
    delete: publicProcedure.mutation(async() => {
        const sessionUser = await getSessionUser();
        if (!sessionUser) {
            log.error("Cannot delete AWS Token, user not found");
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Cannot delete AWS Token, user not found",
            });
        }
        log.debug(`Deleting AWS token for user ${sessionUser.email}`);

        // delete queue from AWS and mongodb
        try {
            const statisticsProcessor = new SQSHandler();
            await statisticsProcessor.deleteQueue();
            await removeQueueFromUser();
        } catch (error) {
            log.error(`Error deleting queue for user ${sessionUser.email}: ${error}`);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Error deleting queue"
            });
        }

        // delete all databases in the mongodb
        const deleteDatabasesResult = await deleteAllDatabases(sessionUser._id);
        if (!deleteDatabasesResult) {
            log.error(`Error deleting databases for user ${sessionUser.email}`);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Error deleting databases"
            });
        }

        // delete all databases in the multiverse
        const multiverse = await (new MultiverseFactory()).getMultiverse();
        const databases = await multiverse.listDatabases();
        await Promise.all(databases.map(async(database) => {
            await multiverse.removeDatabase((await database.getConfiguration()).name);
        }));

        // delete aws token from mongodb
        const tokenRemovalResult = await removeAwsToken();
        if (!tokenRemovalResult) {
            log.error(`Error deleting AWS token for user ${sessionUser.email}`);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Error deleting token"
            });
        }
        log.info(`AWS token deleted for user ${sessionUser.email}`);
    }),
});