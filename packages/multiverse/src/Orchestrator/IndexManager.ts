import type { NewVector } from "../core/Vector";
import type { Query, QueryResult } from "../core/Query";
import type ChangesStorage from "../ChangesStorage";
import type InfrastructureStorage from "../InfrastructureStorage/DynamoInfrastructureStorage";
import log from "@multiverse/log";
import type { StoredVectorChange } from "../ChangesStorage";
import mergeResults from "../Index/mergeResults";
import type { storedDatabaseConfiguration } from "../core/DatabaseConfiguration";
import type ComputeWorker from "../Compute/Worker";

export default class IndexManager {

    /**
     * Every database partition (lambda) has multiple instances.
     * Each instance has its own index with latest update time.
     */

    constructor(private options: {
        indexConfiguration: DatabaseConfiguration;
        databasePartitionFactory: (partitionIndex: number, infrastructure: InfrastructureStorage) => ComputeWorker;
        changesStorage: ChangesStorage;
        infrastructureStorage: InfrastructureStorage;
    }) {

    }

    public async add(vectors: NewVector[]) {

        log.debug("Adding vectors", {
            vectors: vectors.map(vector => ({
                action: "add",
                timestamp: Date.now(),
                vector
            }))
        });

        // TODO: validate vectors
        await this.options.changesStorage.add(vectors.map(vector => ({
            action: "add",
            timestamp: Date.now(),
            vector
        })));
    }

    public async query(query: Query): Promise<QueryResult> {

        log.debug("Querying", { query });

        // TODO: validate query
        const currentInfrastructure = await this.options.infrastructureStorage.getInfrastructure(this.options.indexConfiguration);

        if (!currentInfrastructure) {
            throw new Error("No infrastructure");
        }

        // select partition
        const partitionResults = await Promise.all(currentInfrastructure.partitions.map(async(partitionLambda, partitionIndex) => {

            const activeLambda = partitionLambda.lambda.find(lambda => lambda.active);

            if (!activeLambda) {
                log.warn("No active lambda found", {
                    partitionIndex,
                    partitionLambda,
                    query,
                    currentInfrastructure
                });
            }

            const leastUpdatedTimestamp = activeLambda?.instances.map(instance => instance.lastUpdated).sort()[0] ?? 0;

            // TODO implement partitions into changesAfter
            const changesIterator = this.options.changesStorage.changesAfter(leastUpdatedTimestamp);
            const updates: StoredVectorChange[] = [];

            for await (const change of changesIterator) {
                updates.push(change);
            }

            const lambdaClient = this.options.databasePartitionFactory(partitionIndex, currentInfrastructure);

            const partitionResult = await lambdaClient.query({
                query,
                updates
            });

            return partitionResult;
        }));

        // TODO store states
        log.debug("Merging results", { partitionResults });

        return { result: mergeResults(partitionResults.map(r => r.result.result)) };
    }

    public async remove(label: string[]) {

        log.debug("Removing labels", { label });

        await this.options.changesStorage.add(label.map(label => ({
            action: "remove",
            timestamp: Date.now(),
            label
        })));
    }

    public async count(): Promise<{
        vectors: number,
        vectorDimensions: number
        }> {
        // sum of all partitions

        const currentInfrastructure = await this.options.infrastructureStorage.getInfrastructure(this.options.indexConfiguration);

        if (!currentInfrastructure) {
            throw new Error("No infrastructure");
        }

        const partitionCounts = await Promise.all(currentInfrastructure.partitions.map(async(partitionLambda, partitionIndex) => {

            const activeLambda = partitionLambda.lambda.find(lambda => lambda.active);

            if (!activeLambda) {
                log.warn("No active lambda found", {
                    partitionIndex,
                    partitionLambda,
                    currentInfrastructure
                });
            }

            const leastUpdatedTimestamp = activeLambda?.instances.map(instance => instance.lastUpdated).sort()[0] ?? 0;

            // TODO implement partitions into changesAfter
            const changesIterator = this.options.changesStorage.changesAfter(leastUpdatedTimestamp);
            const updates: StoredVectorChange[] = [];

            for await (const change of changesIterator) {
                updates.push(change);
            }

            const lambdaClient = this.options.databasePartitionFactory(partitionIndex, currentInfrastructure);

            const partitionResult = await lambdaClient.count();

            return partitionResult;
        }));

        return {
            vectors: partitionCounts.reduce((sum, count) => sum + count.vectors, 0),
            vectorDimensions: partitionCounts.reduce((sum, count) => sum + count.vectorDimensions, 0)
        };
    }
}