import { Databases } from "@multiverse/multiverse/dist/Database/MultiverseDB";
import ApiGateway from "@multiverse/multiverse/src/CommonStack/ApiGateway";
import CollectionsBucket from "@multiverse/multiverse/src/CommonStack/CollectionsBucket";
(async() => {
    const app = new App;
    const apiGateway = new ApiGateway();

    const databases = new Databases({});
})();