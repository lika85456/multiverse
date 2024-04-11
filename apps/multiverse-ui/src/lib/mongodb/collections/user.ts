import type { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb/mongodb";

export interface UserGet {
  _id: ObjectId;
  name: string;
  email: string;
  image: string;
  awsToken?: ObjectId;
  sqsQueue?: string;
  databases: string[];
}

export interface UserInsert {
  name: string;
  email: string;
  image: string;
  awsToken?: ObjectId;
  sqsQueue?: string;
  databases: string[];
}

export const getUserByEmail = async(email: string,): Promise<UserGet | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("users").findOne({ email });
        if (!result) {
            return undefined;
        }

        return {
            _id: result._id,
            name: result.name,
            email: result.email,
            image: result.image,
            awsToken: result.awsToken,
            databases: result.databases,
            sqsQueue: result.sqsQueue,
        };
    } catch (error) {
        return undefined;
    }
};

export const updateUser = async(
    userId: ObjectId,
    userData: UserInsert,
): Promise<{ acknowledged: boolean }> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("users").findOne({ _id: userId });
        if (!result) {
            return { acknowledged: false };
        }
        const updatedUser: UserGet = {
            _id: result._id,
            ...userData,
        };

        const updatedUserResult = await db
            .collection("users")
            .updateOne({ _id: userId }, { $set: updatedUser });

        return { acknowledged: updatedUserResult.acknowledged };
    } catch (error) {
        return { acknowledged: false };
    }
};

export const addDatabaseToUser = async(user: ObjectId, database: string): Promise<{ acknowledged: boolean }> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("users").findOne({ _id: user });
        if (!result) {
            return { acknowledged: false };
        }
        const databases = result.databases ? [...result.databases, database] : [database];

        const updatedUserResult = await db
            .collection("users")
            .updateOne(
                { _id: user },
                { $set: { databases } }
            );

        return { acknowledged: updatedUserResult.acknowledged };
    } catch (error) {
        return { acknowledged: false };
    }
};

export const removeDatabaseFromUser = async(userId: ObjectId, codeName: string): Promise<{ acknowledged: boolean }> => {
    const db = (await clientPromise).db();

    try {
        const result = await db.collection("users").findOne({ _id: userId });
        if (!result) {
            return { acknowledged: false };
        }

        const oldDatabases: string[] = result.databases ?? [];
        const newDatabases: string[] = oldDatabases.filter((db) => db !== codeName);

        const updatedUserResult = await db
            .collection("users")
            .updateOne(
                { _id: userId },
                { $set: { databases: newDatabases } }
            );

        return { acknowledged: updatedUserResult.acknowledged };
    } catch (error) {

        return { acknowledged: false };
    }

};

export const removeAllDatabaseFromUser = async(user: ObjectId): Promise<{ acknowledged: boolean }> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("users").findOne({ _id: user });
        if (!result) {
            return { acknowledged: false };
        }
        const updatedUserResult = await db
            .collection("users")
            .updateOne(
                { _id: user },
                { $set: { databases: [] } }
            );

        return { acknowledged: updatedUserResult.acknowledged };
    } catch (error) {
        return { acknowledged: false };
    }
};

export const addQueueToUser = async(queue: string): Promise<{ acknowledged: boolean }> => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        throw new Error("Not logged in");
    }

    try {
        const db = (await clientPromise).db();
        const result = await db.collection("users").findOne({ _id: sessionUser._id });
        if (!result) {
            return { acknowledged: false };
        }
        const updatedUserResult = await db
            .collection("users")
            .updateOne(
                { _id: sessionUser._id },
                { $set: { sqsQueue: queue } }
            );

        return { acknowledged: updatedUserResult.acknowledged };
    } catch (error) {
        return { acknowledged: false };
    }
};

export const removeQueueFromUser = async(): Promise<{ acknowledged: boolean }> => {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
        throw new Error("Not logged in");
    }

    try {
        const db = (await clientPromise).db();
        const result = await db.collection("users").findOne({ _id: sessionUser._id });
        if (!result) {
            return { acknowledged: false };
        }
        const updatedUserResult = await db
            .collection("users")
            .updateOne(
                { _id: sessionUser._id },
                { $unset: { sqsQueue: undefined } }
            );

        return { acknowledged: updatedUserResult.acknowledged };
    } catch (error) {
        return { acknowledged: false };
    }
};

export const getAllQueuesWithCredentials = async(): Promise<{sqs: string, accessKeyId: string, secretAccessKey: string}[]> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("users").find({ sqsQueue: { $exists: true } }).toArray();

        // Filter out users without valid queue or AWS credentials
        const usersFiltered = result.filter((user) => {
            return user.sqsQueue && user.awsToken && user.awsToken.accessTokenId && user.awsToken.secretAccessKey;
        });

        return usersFiltered.map((user) => {
            return {
                sqs: user.sqsQueue as string,
                accessKeyId: user.awsToken?.accessTokenId as string,
                secretAccessKey: user.awsToken?.secretAccessKey as string,
            };
        });
    } catch (error) {
        return [];
    }
};

export const getSessionUser = async(): Promise<UserGet | undefined> => {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    if (!sessionUser || !sessionUser.email) {
        throw new Error("Session not found");
    }
    const email = sessionUser.email;

    return getUserByEmail(email);
};