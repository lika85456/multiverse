import DynamoInfrastructureStorage from "../DynamoInfrastructureStorage";
import infrastructureTest from "./infrastructureTest";

describe("<DynamoInfrastructureStorage>", () => {
    infrastructureTest(new DynamoInfrastructureStorage({
        region: "eu-central-1",
        tableName: "multiverse-test-infrastructure-storage-" + Date.now(),
        awsToken: undefined as any
    }));
});