import clientPromise from "@/lib/mongodb/mongodb";
import type { ObjectId } from "mongodb";
import { getUserById, updateUser } from "@/lib/mongodb/collections/user";
import { decryptSecretAccessKey, encryptSecretAccessKey } from "@/lib/encryption/aws-token";
import log from "@multiverse/log";

export interface AwsTokenGet {
  _id: ObjectId;
  accessKeyId: string;
  secretAccessKey: string;
  ownerId: ObjectId;
}

export interface AwsTokenInsert {
  accessKeyId: string;
  secretAccessKey: string;
  ownerId: ObjectId;
}

/**
 * Add an AWS token to the database and the user
 * @throws {Error} if the user is not found
 * @throws {Error} if the user already has an AWS token
 * @returns {accessKeyId: string, ownerId: string} - the aws token
 * @param tokenData
 */
export const addAwsToken = async(tokenData: AwsTokenInsert,): Promise<AwsTokenGet> => {
    const owner = await getUserById(tokenData.ownerId);
    if (!owner) {
        throw new Error("User not found");
    }
    if (owner.awsToken) {
        throw new Error("User already has an AWS token");
    }
    const client = await clientPromise;
    const session = client.startSession();
    const db = client.db();

    try {
        return await session.withTransaction(async() => {
            const result = await db.collection("aws_tokens").insertOne({
                accessKeyId: tokenData.accessKeyId,
                secretAccessKey: encryptSecretAccessKey(tokenData.accessKeyId, tokenData.secretAccessKey),
                ownerId: owner._id,
            });
            if (!result.acknowledged) {
                throw new Error("Insertion not acknowledged\"");
            }

            await updateUser(owner._id, {
                ...owner,
                awsToken: result.insertedId,
            });

            return {
                _id: result.insertedId,
                ...tokenData, // return decrypted data
                ownerId: owner._id,
            };
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        log.error(error);
        throw new Error("Error adding aws token");
    } finally {
        await session.endSession();
    }
};

/**
 * Get the AWS token by the token id.
 * @throws {Error} if the token is not found
 * @returns {accessKeyId: string, ownerId: string} - the aws token
 * @param tokenId - the token id
 */
export const getAwsTokenById = async(tokenId: ObjectId): Promise<AwsTokenGet | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("aws_tokens").findOne({ _id: tokenId });

        if (!result) {
            return undefined;
        }

        return {
            _id: result._id,
            accessKeyId: result.accessKeyId,
            secretAccessKey: decryptSecretAccessKey(result.accessKeyId, result.secretAccessKey),
            ownerId: result.ownerId,
        };
    } catch (error) {
        log.error(error);
        throw new Error("Error getting aws token by token id");
    }
};

/**
 * Get the AWS token by the access key id.
 * @param accessKeyId
 */
export const getAwsTokenByAccessKeyId = async(accessKeyId: string,): Promise<AwsTokenGet | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("aws_tokens").findOne({ accessKeyId });

        if (!result) {
            return undefined;
        }

        return {
            _id: result._id,
            accessKeyId: result.accessKeyId,
            secretAccessKey: decryptSecretAccessKey(result.accessKeyId, result.secretAccessKey),
            ownerId: result.ownerId,
        };
    } catch (error) {
        log.error(error);
        throw new Error("Error getting aws token by access key id");
    }
};

/**
 * Get the AWS token of the user.
 * @param ownerId - the owner id of the token
 * @returns {accessKeyId: string, ownerId: string} - the aws token
 * @returns {null} - if the token does not exist
 */
export const getAwsTokenByOwner = async(ownerId: ObjectId,): Promise<AwsTokenGet | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("aws_tokens").findOne({ ownerId });

        if (!result) {
            return undefined;
        }
        const awsToken: AwsTokenGet = {
            _id: result._id,
            accessKeyId: result.accessKeyId,
            secretAccessKey: decryptSecretAccessKey(result.accessKeyId, result.secretAccessKey),
            ownerId: result.ownerId,
        };

        return Promise.resolve(awsToken);
    } catch (error) {
        log.error(error);
        throw new Error("Error getting aws token by owner id");
    }
};

/**
 * Remove the AWS token from the database and the user
 * @throws {Error} if the user is not logged in
 * @throws {Error} if the token is not found
 * @throws {Error} if the token is not removed
 */
export const removeAwsToken = async(userId: ObjectId): Promise<void> => {
    const client = await clientPromise;
    const db = client.db();
    const session = client.startSession();
    try {
        await session.withTransaction(async() => {
            const user = await getUserById(userId);
            if (!user) {
                throw new Error("User not found");
            }

            const result = await db
                .collection("aws_tokens")
                .deleteOne({ ownerId: user._id });
            if (!result.acknowledged) {
                throw new Error("AWS token not removed");
            }
            if (result.deletedCount > 1) {
                log.error("More than one AWS token was deleted, this should not happen");
            }
            if (result.deletedCount === 0) {
                throw new Error("No AWS token was deleted, this should not happen");
            }

            // remove the token from the user
            const updatedUser = {
                ...user,
                awsToken: undefined,
            };
            await updateUser(updatedUser._id, updatedUser);
        });
    } catch (error) {
        log.error("Error removing aws token: ", error);
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw new Error("Could not remove the token");
    } finally {
        await session.endSession();
    }
};