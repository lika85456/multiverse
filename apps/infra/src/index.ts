import MemoryDatabaseStorage from "@multiverse/multiverse/src/DatabaseStorage/MemoryDatabaseStorage";
import Workspace from "@multiverse/multiverse/src/Workspace/Workspace";

const apiGatewayARN = "arn:aws:apigateway:eu-central-1::/restapis/azomjrsy23/stages/test";

(async() => {
    const memoryDbStorage = new MemoryDatabaseStorage();

    const id = `test-${Math.random()}`;

    await memoryDbStorage.addDatabase(id, {
        apiGatewayARN,
        collectionName: "my-first-collection",
        ephemeralStorageSize: 1024,
        memorySize: 1024,
        name: "my-first-database",
        region: "eu-central-1",
        type: "static"
    });

    const workspace = new Workspace(
        id,
        "eu-central-1",
        // azomjrsy23
        apiGatewayARN,
        memoryDbStorage
    );

    await workspace.deploy();

    // await workspace.destroy();
})();