import * as mongoose from "mongoose";
import { AwsToken } from "@/lib/database/schemas/aws-token";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    awsToken: AwsToken,
});

export const User = mongoose.model("User", userSchema);