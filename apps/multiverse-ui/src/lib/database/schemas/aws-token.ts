import mongoose from "mongoose";

const awsTokenSchema = new mongoose.Schema({
    accessTokenId: {
        type: String,
        required: true,
    },
    secretAccessKey: {
        type: String,
        required: true,
    },
});

export const AwsToken = mongoose.model("AwsToken", awsTokenSchema);