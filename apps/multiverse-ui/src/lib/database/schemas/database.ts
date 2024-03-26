import mongoose from "mongoose";
import { DatabaseStatistics } from "@/lib/database/schemas/statistics";

const databaseSchema = new mongoose.Schema({
    codeName: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    locality: {
        type: String,
        required: true,
    },
    dimensions: {
        type: Number,
        required: true,
    },
    space: {
        type: String,
        required: true,
    },
    statistics: DatabaseStatistics,
});

export const Database = mongoose.model("Database", databaseSchema);