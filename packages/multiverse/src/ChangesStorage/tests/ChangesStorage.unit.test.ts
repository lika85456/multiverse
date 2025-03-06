import MemoryChangesStorage from "../MemoryChangesStorage";
import changesStorageTest from "./changesStorageTest";

describe("<MemoryChangesStorage>", () => {
    changesStorageTest(new MemoryChangesStorage());
});