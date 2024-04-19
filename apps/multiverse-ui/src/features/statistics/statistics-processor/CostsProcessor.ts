import type { UTCDate } from "@date-fns/utc";
import { addDays, format } from "date-fns";
import {
    CostExplorerClient, DataUnavailableException, GetCostAndUsageCommand, Granularity, MatchOption
} from "@aws-sdk/client-cost-explorer";
import log from "@multiverse/log";
import type { ObjectId } from "mongodb";
import { getAwsTokenByOwner } from "@/lib/mongodb/collections/aws-token";

export type Cost = {
    date: UTCDate;
    cost: number;
};

export class CostsProcessor {
    getCosts = async(from: UTCDate, to: UTCDate, userId: ObjectId, databaseCodeName?: string): Promise<Cost[]> => {
        const awsToken = await getAwsTokenByOwner(userId);
        if (!awsToken) {
            throw Error(`No AWS token found for user ${userId}, cannot get costs.`);
        }

        log.debug(`Getting costs ${databaseCodeName ? `for database ${databaseCodeName}` : ""} from ${format(from, "yyyy-MM-dd")} to ${format(addDays(to, 1), "yyyy-MM-dd")}`);
        const client = new CostExplorerClient({
            region: "eu-central-1",
            credentials: {
                accessKeyId: awsToken.accessKeyId,
                secretAccessKey: awsToken.secretAccessKey
            }
        });

        const input = { // GetCostAndUsageRequest
            TimePeriod: {
                Start: format(from, "yyyy-MM-dd"),
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
            Metrics: ["UNBLENDED_COST"],
        };
        try {
            const command = new GetCostAndUsageCommand(input);
            const response = await client.send(command);
            log.debug(`GetCostAndUsageCommandOutput: ${JSON.stringify(response, null, 2)}`);
            // response.ResultsByTime?.forEach((result) => {
            //     const cost = Number(result.Total?.toString());
            //     log.debug(`Cost for ${result.TimePeriod?.Start} - ${result.TimePeriod?.End}: ${cost}`);
            // });

            // TODO - process costs
            return [];
        } catch (error) {
            if (error instanceof DataUnavailableException) {
                log.error("Data not available.");

                return [];
            }
            throw error;
        }
    };
}