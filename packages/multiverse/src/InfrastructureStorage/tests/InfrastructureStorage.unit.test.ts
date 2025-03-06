import MemoryInfrastructureStorage from "../MemoryInfrastructureStorage";
import infrastructureTest from "./infrastructureTest";

describe("<MemoryInfrastructureStorage>", () => {
    infrastructureTest(new MemoryInfrastructureStorage());
});