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
}

export interface UserInsert {
  name: string;
  email: string;
  image: string;
  awsToken?: ObjectId;
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

export const getSessionUser = async(): Promise<UserGet | undefined> => {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;
    if (!sessionUser || !sessionUser.email) {
        throw new Error("Session not found");
    }
    const email = sessionUser.email;

    return getUserByEmail(email);
};