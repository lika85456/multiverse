import type ChangesStorage from "../ChangesStorage";
import type Index from "../Index";
import type { DatabaseConfiguration } from "../DatabaseConfiguration";
import type { DatabaseInfrastructure } from "../InfrastructureStorage/DynamoInfrastructureStorage";
import type SnapshotStorage from "../SnapshotStorage";
import type DatabaseClient from "./DatabaseClient";
import DatabaseWorker from "./DatabaseWorker";

export default function localDatabaseClientFactory({
    changesStorage, indexConfiguration, index, snapshotStorage
}: {
    changesStorage: ChangesStorage;
    indexConfiguration: IndexConfiguration;
    index: Index;
    snapshotStorage: SnapshotStorage;
}): (partitionIndex: number, infrastructure: DatabaseInfrastructure) => DatabaseClient {

    return (_partitionIndex: number, _infrastructure: DatabaseInfrastructure) => {

        return new DatabaseWorker({
            changesStorage,
            config: indexConfiguration,
            ephemeralLimit: 8000,
            index,
            memoryLimit: 8000,
            snapshotStorage
        });
    };
}