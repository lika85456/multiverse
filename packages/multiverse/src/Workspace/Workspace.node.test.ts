import MemoryDatabaseStorage from "../DatabaseStorage/MemoryDatabaseStorage";
import Workspace from "./Workspace";

describe.skip("<Workspace>", () => {

    let workspace: Workspace;

    it("Should deploy a single static database", async() => {
        const memoryDbStorage = new MemoryDatabaseStorage();

        const id = `test-${Math.random()}`;
        workspace = new Workspace(
            id,
            "eu-central-1",
            // azomjrsy23
            "arn:aws:apigateway:eu-central-1::/restapis/azomjrsy23/stages/test",
            memoryDbStorage
        );

        await workspace.deploy();
    });

    afterEach(async() => {
        await workspace.destroy();
    });
});