import type { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb/mongodb";
import { getAwsTokenById } from "@/lib/mongodb/collections/aws-token";
import log from "@multiverse/log";
import { authOptions } from "@/lib/auth/auth";

export interface UserGet {
    _id: ObjectId;
    name?: string;
    email: string;
    image?: string;
    awsToken?: ObjectId;
    sqsQueue?: string;
    databases: string[];
    dbsToBeDeleted: string[];
    dbsToBeCreated: string[];
    acceptedCostsGeneration: boolean;
}

export interface UserInsert {
    name?: string;
    email: string;
    image?: string;
    awsToken?: ObjectId;
    sqsQueue?: string;
    databases: string[];
    dbsToBeDeleted: string[];
    dbsToBeCreated: string[];
    acceptedCostsGeneration: boolean;
}

/**
 * Make sure all fields are present in the user object
 * @param user - the user object
 */
const normalizeUser = (user: UserGet): UserGet => {
    return {
        _id: user._id,
        name: user.name ?? undefined,
        email: user.email,
        image: user.image ?? undefined,
        awsToken: user.awsToken ?? undefined,
        databases: user.databases ?? [],
        sqsQueue: user.sqsQueue ?? undefined,
        dbsToBeDeleted: user.dbsToBeDeleted ?? [],
        dbsToBeCreated: user.dbsToBeCreated ?? [],
        acceptedCostsGeneration: user.acceptedCostsGeneration ?? false,
    } as UserGet;
};

/**
 * Get a user by its email
 * @param email - the email of the user
 * @returns {UserGet} - the user
 * @returns {undefined} - if the user does not exist
 */
export const getUserByEmail = async(email: string,): Promise<UserGet | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ email });
        if (!result) {
            return undefined;
        }

        return normalizeUser(result);
    } catch (error) {
        log.error(error);
        throw new Error("Error getting user by email");
    }
};

/**
 * Get a user by its id
 * @param userId
 * @returns {UserGet} - the user
 * @returns {undefined} - if the user does not exist
 */
export const getUserById = async(userId: ObjectId): Promise<UserGet | undefined> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: userId });
        if (!result) {
            return undefined;
        }

        return normalizeUser(result);
    } catch (error) {
        log.error(error);
        throw new Error("Error getting user by id");
    }
};

/**
 * Add a user to the database
 * @param userId - the id of the user
 * @param userData - the user data
 * @returns {ObjectId} - the id of the user
 * @returns {undefined} - if the user could not be added
 * @throws {Error} - if the user could not be updated
 * @throws {Error} - if the update is not acknowledged by mongodb
 */
export const updateUser = async(
    userId: ObjectId,
    userData: UserInsert,
): Promise<void> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: userId });
        if (!result) {
            throw new Error("User not found");
        }
        const updatedUser: UserGet = {
            _id: result._id,
            ...userData,
        };

        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne({ _id: userId }, { $set: updatedUser });

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error updating user ${userData.email}`);
    }
};

export const changeUserAcceptedCostsGeneration = async(userId: ObjectId, acceptedCostsGeneration: boolean): Promise<boolean> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection("users").findOne({ _id: userId });
        if (!result) {
            throw new Error("User not found");
        }

        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: userId },
                { $set: { acceptedCostsGeneration } }
            );

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }

        return acceptedCostsGeneration;
    } catch (error) {
        log.error(error);
        throw new Error(`Error updating user ${userId} accepted costs generation`);
    }
};

/**
 * Add database to user
 * @param user - the user data
 * @param database - the database code name
 * @throws {Error} - database could not be added to user
 */
export const addDatabaseToUser = async(user: ObjectId, database: string): Promise<void> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: user });
        if (!result) {
            throw new Error("User not found");
        }
        const databases = result.databases ? [...result.databases, database] : [database];

        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: user },
                { $set: { databases } }
            );

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error adding database ${database} to user ${user}`);
    }
};

/**
 * Remove database from user
 * @param ownerId - the id of the user
 * @param codeName - the code name of the database
 * @throws {Error} - if the database could not be removed from the user
 * @throws {Error} - if the update is not acknowledged by mongodb
 */
export const removeDatabaseFromUser = async(ownerId: ObjectId, codeName: string): Promise<void> => {
    const db = (await clientPromise).db();

    try {
        const result = await db.collection<UserGet>("users").findOne({ _id: ownerId });
        if (!result) {
            throw new Error("User not found");
        }

        const oldDatabases: string[] = result.databases ?? [];
        const newDatabases: string[] = oldDatabases.filter((db) => db !== codeName);

        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: ownerId },
                { $set: { databases: newDatabases } }
            );

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error removing database ${codeName} from owner ${ownerId}`);
    }

};

export const addDatabaseToBeDeletedToUser = async(ownerId: ObjectId, codeName: string): Promise<void> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: ownerId });
        if (!result) {
            throw new Error("User not found");
        }
        const dbsToBeDeleted = result.dbsToBeDeleted ? [...result.dbsToBeDeleted, codeName] : [codeName];

        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: ownerId },
                { $set: { dbsToBeDeleted } }
            );

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error adding database ${codeName} to be deleted to user ${ownerId}`);
    }
};

// export const getDatabasesToBeDeletedFromUser = async(ownerId: ObjectId): Promise<string[]> => {
//     try {
//         const db = (await clientPromise).db();
//         const result = await db.collection("users").findOne({ _id: ownerId });
//         if (!result) {
//             throw new Error("User not found");
//         }
//
//         return result.dbsToBeDeleted ?? [];
//     } catch (error) {
//         log.error(error);
//         throw new Error(`Error getting databases to be deleted from owner ${ownerId}`);
//     }
// };

export const removeDatabaseToBeDeletedFromUser = async(ownerId: ObjectId, codeName: string): Promise<void> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: ownerId });
        if (!result) {
            throw new Error("User not found");
        }

        const oldDbsToBeDeleted: string[] = result.dbsToBeDeleted ?? [];
        const newDbsToBeDeleted: string[] = oldDbsToBeDeleted.filter((db) => db !== codeName);

        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: ownerId },
                { $set: { dbsToBeDeleted: newDbsToBeDeleted } }
            );

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error removing database ${codeName} to be deleted from owner ${ownerId}`);
    }
};

export const addDatabaseToBeCreatedToUser = async(ownerId: ObjectId, codeName: string): Promise<void> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: ownerId });
        if (!result) {
            throw new Error("User not found");
        }
        const dbsToBeCreated = result.dbsToBeCreated ? [...result.dbsToBeCreated, codeName] : [codeName];

        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: ownerId },
                { $set: { dbsToBeCreated } }
            );

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error adding database ${codeName} to be created to user ${ownerId}`);
    }
};

// export const getDatabasesToBeCreatedFromUser = async(ownerId: ObjectId): Promise<string[]> => {
//     try {
//         const db = (await clientPromise).db();
//         const result = await db.collection("users").findOne({ _id: ownerId });
//         if (!result) {
//             throw new Error("User not found");
//         }
//
//         return result.dbsToBeCreated ?? [];
//     } catch (error) {
//         log.error(error);
//         throw new Error(`Error getting databases to be created from owner ${ownerId}`);
//     }
// };

export const removeDatabaseToBeCreatedFromUser = async(ownerId: ObjectId, codeName: string): Promise<void> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: ownerId });
        if (!result) {
            throw new Error("User not found");
        }

        const oldDbsToBeCreated: string[] = result.dbsToBeCreated ?? [];
        const newDbsToBeCreated: string[] = oldDbsToBeCreated.filter((db) => db !== codeName);

        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: ownerId },
                { $set: { dbsToBeCreated: newDbsToBeCreated } }
            );

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error removing database ${codeName} to be created from owner ${ownerId}`);
    }
};

/**
 * Remove all databases from user
 * @param user
 * @throws {Error} - if the user does not exist
 * @throws {Error} - if the update is not acknowledged by mongodb
 */
export const removeAllDatabaseFromUser = async(user: ObjectId): Promise<void> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: user });
        if (!result) {
            throw new Error("User not found");
        }
        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: user },
                { $set: { databases: [] } }
            );
        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error removing all databases from owner ${user}`);
    }
};

/**
 * Add a queue to a user
 * @param ownerId
 * @param queue
 * @throws {Error} - if the user does not exist
 * @throws {Error} - if the user already has a queue
 * @throws {Error} - if the update is not acknowledged by mongodb
 */
export const addQueueToUser = async(ownerId: ObjectId, queue: string): Promise<void> => {

    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: ownerId });
        if (!result) {
            throw new Error("User not found");
        }
        if (result.sqsQueue) {
            throw new Error("User already has a queue");
        }
        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: ownerId },
                { $set: { sqsQueue: queue } }
            );

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error adding queue ${queue} to user ${ownerId}`);
    }
};

/**
 * Remove queue from user
 * @param ownerId - the id of the user
 * @throws {Error} - if the user does not exist
 * @throws {Error} - if the update is not acknowledged by mongodb
 */
export const removeQueueFromUser = async(ownerId: ObjectId): Promise<void> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").findOne({ _id: ownerId });
        if (!result) {
            throw new Error("User not found");
        }
        const updatedUserResult = await db
            .collection<UserGet>("users")
            .updateOne(
                { _id: result._id },
                { $set: { sqsQueue: undefined } }
            );

        if (!updatedUserResult.acknowledged) {
            throw new Error("Update not acknowledged");
        }
    } catch (error) {
        log.error(error);
        throw new Error(`Error removing queue from user ${ownerId}`);
    }
};

/**
 * Get queues from all users with AWS credentials
 * @returns {sqs: string, accessKeyId: string, secretAccessKey: string}[] - the queues with AWS credentials
 * @throws {Error} - if the queues could not be retrieved
 * @throws {Error} - if the AWS token in user is not found in the database
 */
export const getAllQueuesWithCredentials = async(): Promise<{sqs: string, accessKeyId: string, secretAccessKey: string}[]> => {
    try {
        const db = (await clientPromise).db();
        const result = await db.collection<UserGet>("users").find().toArray();

        const credentialsList = await Promise.all(result.map(async(user) => {
            if (!user.awsToken) {
                return undefined;
            }
            if (!user.sqsQueue) {
                return undefined;
            }

            const awsToken = await getAwsTokenById(user.awsToken);
            if (!awsToken) {
                throw new Error("AWS Token not found");
            }

            return {
                sqs: user.sqsQueue,
                accessKeyId: awsToken.accessKeyId,
                secretAccessKey: awsToken.secretAccessKey,
            };
        }));

        // Filter out users without valid queue or AWS credentials
        return credentialsList.filter((credential) => {
            return credential !== undefined;
        }) as {sqs: string, accessKeyId: string, secretAccessKey: string}[];

    } catch (error) {
        log.error(error);
        throw new Error("Error getting all queues with credentials");
    }
};

/**
 * Get the user of the current session
 * @returns {UserGet} - the user
 * @returns {undefined} - if the user does not exist
 * @throws {Error} - if the session user could not be retrieved
 */
export const getSessionUser = async(): Promise<UserGet | undefined> => {
    try {
        const session = await getServerSession(authOptions);
        const sessionUser = session?.user;
        if (!sessionUser || !sessionUser.email) {
            return undefined;
        }

        return getUserByEmail(sessionUser.email);
    } catch (error) {
        log.error(error);
        throw new Error("Error getting session user");
    }

};