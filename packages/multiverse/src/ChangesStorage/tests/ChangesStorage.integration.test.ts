import DynamoChangesStorage from "../DynamoChangesStorage";
import changesStorageTest from "./changesStorageTest";

describe("<DynamoChangesStorage>", () => {
    changesStorageTest(new DynamoChangesStorage({
        tableName: "multiverse-test-changes-storage-" + Date.now(),
        databaseId: {
            name: "test",
            region: "eu-central-1"
        },
        awsToken: undefined as any
    }));
});