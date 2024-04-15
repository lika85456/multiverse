import clientPromise from "@/lib/mongodb/mongodb";
import type { ObjectId } from "mongodb";
import { getSessionUser, updateUser } from "@/lib/mongodb/collections/user";
import { decryptSecretAccessKey, encryptSecretAccessKey } from "@/lib/encryption/aws-token";

export interface AwsTokenGet {
  _id: ObjectId;
  accessKeyId: string;
  secretAccessKey: string;
  ownerId: ObjectId;
}

export interface AwsTokenInsert {
  accessKeyId: string;
  secretAccessKey: string;
}

// TODO add awsToken encryption when storing and retrieving from mongodb

export const addAwsToken = async(tokenData: AwsTokenInsert,): Promise<AwsTokenGet | undefined> => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        throw new Error("Not logged in");
    }
    if (sessionUser.awsToken) {
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
                ownerId: sessionUser._id,
            });
            const updatedUser = await updateUser(sessionUser._id, {
                ...sessionUser,
                awsToken: result.insertedId,
            });

            if (updatedUser.acknowledged && result.acknowledged) {
                return {
                    _id: result.insertedId,
                    ...tokenData, // return decrypted data
                    ownerId: sessionUser._id,
                };
            }
        });
    } catch (error) {
        console.log("Error adding aws token: ", error);
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        return undefined;
    } finally {
        await session.endSession();
    }
};

export const getAwsTokenByTokenId = async(tokenId: ObjectId): Promise<AwsTokenGet | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("aws_tokens").findOne({ _id: tokenId });

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
        console.log("Error getting aws token by token id: ", error);

        return undefined;
    }
};

export const getAwsTokenByAccessKeyId = async(accessKeyId: string,): Promise<AwsTokenGet | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("aws_tokens").findOne({ accessKeyId });

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
        console.log("Error getting aws token by access key id: ", error);

        return undefined;
    }
};

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
        console.log("Error getting aws token by owner id: ", error);

        return undefined;
    }
};

export const removeAwsToken = async(): Promise<boolean> => {
    const sessionUser = await getSessionUser();
    if (sessionUser === undefined) {
        console.log("Cannot remove AWS Token, user is not logged in");
        throw new Error("Cannot remove AWS Token, user is not logged in");
    }

    const client = await clientPromise;
    const db = client.db();
    const session = client.startSession();
    try {

        return await session.withTransaction(async() => {
            const result = await db
                .collection("aws_tokens")
                .deleteOne({ ownerId: sessionUser._id });
            const updatedUser = {
                ...sessionUser,
                awsToken: undefined,
            };
            const userResult = await updateUser(updatedUser._id, updatedUser);

            return result.deletedCount === 1 && userResult !== undefined;
        });
    } catch (error) {
        console.log("Error removing aws token: ", error);
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw new Error("Could not remove the token");
    } finally {
        await session.endSession();
    }
};