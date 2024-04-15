import clientPromise from "@/lib/mongodb/mongodb";
import type { ObjectId } from "mongodb";
import { getSessionUser, updateUser } from "@/lib/mongodb/collections/user";
import { TRPCError } from "@trpc/server";

export interface AwsTokenGet {
  _id: ObjectId;
  accessTokenId: string;
  secretAccessKey: string;
  ownerId: ObjectId;
}

export interface AwsTokenInsert {
  accessTokenId: string;
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
                ...tokenData,
                ownerId: sessionUser._id,
            });
            const updatedUser = await updateUser(sessionUser._id, {
                ...sessionUser,
                awsToken: result.insertedId,
            });

            if (updatedUser.acknowledged && result.acknowledged) {
                return {
                    _id: result.insertedId,
                    ...tokenData,
                    ownerId: sessionUser._id,
                };
            }
        });
    } catch (error) {
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
            accessTokenId: result.accessTokenId,
            secretAccessKey: result.secretAccessKey,
            ownerId: result.ownerId,
        };

        return Promise.resolve(awsToken);
    } catch (error) {
        return undefined;
    }
};

export const getAwsTokenByAccessTokenId = async(accessTokenId: string,): Promise<AwsTokenGet | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("aws_tokens").findOne({ accessTokenId });

        if (!result) {
            return undefined;
        }
        const awsToken: AwsTokenGet = {
            _id: result._id,
            accessTokenId: result.accessTokenId,
            secretAccessKey: result.secretAccessKey,
            ownerId: result.ownerId,
        };

        return Promise.resolve(awsToken);
    } catch (error) {
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
            accessTokenId: result.accessTokenId,
            secretAccessKey: result.secretAccessKey,
            ownerId: result.ownerId,
        };

        return Promise.resolve(awsToken);
    } catch (error) {
        return undefined;
    }
};

export const removeAwsToken = async(): Promise<boolean> => {
    const sessionUser = await getSessionUser();
    if (sessionUser === undefined) {
        throw new Error("Not logged in");
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
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw new Error("Could not remove the token");
    } finally {
        await session.endSession();
    }
};