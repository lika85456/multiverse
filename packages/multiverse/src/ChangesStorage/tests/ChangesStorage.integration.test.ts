import BucketChangesStorage from "../BucketChangesStorage";
// import DynamoChangesStorage from "../DynamoChangesStorage";
import changesStorageTest from "./changesStorageTest";

describe.each([
    // ["<DynamoChangesStorage>", new DynamoChangesStorage({
    //     tableName: "multiverse-test-changes-storage-" + Date.now(),
    //     databaseId: {
    //         name: "test",
    //         region: "eu-central-1"
    //     },
    //     awsToken: undefined as any
    // })],
    [
        "<BucketChangesStorage>",
        new BucketChangesStorage("multiverse-test-changes-storage-" + Date.now(), {
            region: "eu-central-1",
            awsToken: undefined as any,
            maxObjectAge: 10000
        })
    ]
])("%i", (name, storage) => {
    changesStorageTest(storage);
});