// import { Databases } from "@multiverse/multiverse/dist/Database/MultiverseDB";
// import ApiGateway from "@multiverse/multiverse/src/CommonStack/ApiGateway";
// import CollectionsBucket from "@multiverse/multiverse/src/CommonStack/CollectionsBucket";
// (async() => {
//     const app = new App;
//     const apiGateway = new ApiGateway();

//     const databases = new Databases({});
// })();

// const apiGatewayARN = "arn:aws:apigateway:us-east-1::/restapis/6q2q3q3q3q/stages/dev";

interface DatabaseStorage {
    getDatabases(workspaceName: string): Promise<DatabaseSettings[]>;
}

interface WorkspaceStorage {
    getWorkspace(workspaceName: string): Promise<Workspace | null>;
}

class Workspace {
    constructor(
        public readonly name: string,
        public readonly region: string,
        public readonly apiGatewayARN: string,
        private readonly storage: DatabaseStorage
    ) {

    }

    // stack to be used in cli
    public async deploy() {

    }

    public async destroy() {

    }

    private async stack() {

    }
}