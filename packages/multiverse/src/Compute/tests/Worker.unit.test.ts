import type { DatabaseID, DatabaseConfiguration } from "../../core/DatabaseConfiguration";
import LocalIndex from "../../Index/LocalIndex";
import LocalSnapshotStorage from "../../SnapshotStorage/LocalSnapshotStorage";
import ComputeWorker from "../ComputeWorker";
import workerTest from "./workerTest";

function initializeLocalWorker({
    databaseId,
    config
}: {
    databaseId: DatabaseID;
    config: DatabaseConfiguration;
}) {
    const snapshotStorage = new LocalSnapshotStorage(databaseId.name);

    const worker = new ComputeWorker({
        partitionIndex: 0,
        snapshotStorage,
        index: new LocalIndex(config),
        memoryLimit: 1000,
        ephemeralLimit: 1000
    });

    return {
        worker,
        snapshotStorage,
        config,
        deploy: async() => {},
        destroy: async() => {}
    };
}

describe("<ComputeWorker - Local>", () => {
    workerTest(initializeLocalWorker);
});