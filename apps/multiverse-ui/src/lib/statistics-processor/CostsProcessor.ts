import { UTCDate } from "@date-fns/utc";
import { addDays, format } from "date-fns";
import {
    CostExplorerClient, DataUnavailableException, GetCostAndUsageCommand, Granularity, MatchOption
} from "@aws-sdk/client-cost-explorer";
import log from "@multiverse/log";
import type { ObjectId } from "mongodb";
import { getAwsTokenByOwner } from "@/lib/mongodb/collections/aws-token";
import { ENV } from "@/lib/env";

export type Cost = {
    date: UTCDate;
    cost: number;
};

// unlock others if needed
enum Metric {
     // AmortizedCost = "AmortizedCost",
     // BlendedCost = "BlendedCost",
     // NetAmortizedCost = "NetAmortizedCost",
     // NetUnblendedCost = "NetUnblendedCost",
     // NormalizedUsageAmount = "NormalizedUsageAmount",
     UnblendedCost = "UnblendedCost",
     // UsageQuantity = "UsageQuantity"
}

export class CostsProcessor {
    private constructCostAndUsageCommand = (from: UTCDate, to: UTCDate, databaseCodeName?: string) => {
        return new GetCostAndUsageCommand({
            TimePeriod: {
                Start: format(addDays(from, -1), "yyyy-MM-dd"),
                End: format(addDays(to, 1), "yyyy-MM-dd"), // end date is exclusive
            },
            Granularity: Granularity.DAILY,
            Filter: {
                Tags: databaseCodeName ? {
                    Key: "multiverse:databaseCodeName", // filter by databaseCodeName
                    Values: [
                        databaseCodeName,
                    ],
                    MatchOptions: [
                        MatchOption.EQUALS
                    ],
                } : {
                    Key: "multiverse", // filter by multiverse tag (all costs related to multiverse)
                    Values: [
                        "multiverse",
                    ],
                    MatchOptions: [
                        MatchOption.EQUALS
                    ],
                },
            },
            Metrics: [Metric.UnblendedCost],
        });
    };

    getCosts = async(from: UTCDate, to: UTCDate, userId: ObjectId, databaseCodeName?: string): Promise<Cost[]> => {
        const awsToken = await getAwsTokenByOwner(userId);
        if (!awsToken) {
            throw Error(`No AWS token found for user ${userId}, cannot get costs.`);
        }

        if (ENV.NODE_ENV === "development") {
            log.debug("Development mode, returning empty costs");

            return []; // request costs 0.01$ per request, return empty costs in development mode
        }
        log.warn("Production mode, requesting costs from AWS. Prepare your wallet! (0.01$ per request)");

        try {
            log.debug(`Getting costs${databaseCodeName ? ` for database ${databaseCodeName}` : ""} from ${format(from, "yyyy-MM-dd")} to ${format(addDays(to, 1), "yyyy-MM-dd")}`);
            const client = new CostExplorerClient({
                region: "eu-central-1",
                credentials: {
                    accessKeyId: awsToken.accessKeyId,
                    secretAccessKey: awsToken.secretAccessKey
                }
            });
            const response = await client.send(this.constructCostAndUsageCommand(from, to, databaseCodeName));
            // log.debug(`GetCostAndUsageCommandOutput: ${JSON.stringify(response, null, 2)}`);

            return response.ResultsByTime?.reduce((acc, curr) => {
                acc.push({
                    cost: Number(curr.Total?.UnblendedCost?.Amount ?? 0),
                    date: new UTCDate(curr.TimePeriod?.Start ?? new UTCDate())
                });

                return acc;
            }, [] as Cost[]) ?? [];
        } catch (error) {
            if (error instanceof DataUnavailableException) {
                log.error("Data not available.");

                return [];
            }
            throw error;
        }
    };
}