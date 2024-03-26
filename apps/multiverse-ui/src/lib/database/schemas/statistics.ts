import mongoose from "mongoose";

const databaseStatisticsSchema = new mongoose.Schema({
    hourlyStatistics: {
        type: Array({
            time: {
                type: Date,
                required: true,
            },
            value: {
                type: Number,
                required: true,
            },
        }),
        required: true,
    },
    dailyStatistics: {
        type: Array({
            time: {
                type: Date,
                required: true,
            },
            value: {
                type: Number,
                required: true,
            },
        }),
        required: true,
    },
});

export const DatabaseStatistics = mongoose.model(
    "DatabaseStatistics",
    databaseStatisticsSchema,
);