// import { ENV } from "@/lib/env";
import type { IMultiverse } from "@multiverse/multiverse";
import Multiverse from "@multiverse/multiverse";
// import Multiverse from "@multiverse/multiverse";
import { MultiverseMock } from "@/lib/multiverse-interface/MultiverseMock";
import type { UserFind } from "@/lib/mongodb/collections/user";
import { getSessionUser } from "@/lib/mongodb/collections/user";
import { getAwsTokenByOwner } from "@/lib/mongodb/collections/aws-token";
import { ENV } from "@/lib/env";
import { Resource } from "sst";

export class MultiverseFactory {
    private readonly user: Promise<UserFind | undefined>;
    private readonly multiverse: Promise<IMultiverse>;

    public constructor() {
        this.user = getSessionUser();
        this.multiverse = this.constructMultiverse();
    }

    public async constructMultiverse(): Promise<IMultiverse> {

        const user = await this.user;
        if (!user?.awsToken) {
            throw new Error("No AWS Token to create the multiverse");
        }

        const awsToken = await getAwsTokenByOwner(user._id);
        if (!awsToken) {
            throw new Error("No AWS Token to create the multiverse");
        }

        if (ENV.NODE_ENV === "development") {
            return Promise.resolve(new MultiverseMock({
                awsToken: {
                    accessKeyId: awsToken.accessKeyId,
                    secretAccessKey: awsToken.secretAccessKey,
                },
                region: "eu-central-1",
            }));
        }

        return Promise.resolve(new Multiverse({
            awsToken: {
                accessKeyId: awsToken.accessKeyId,
                secretAccessKey: awsToken.secretAccessKey,
            },
            region: "eu-west-1",
            name: ENV.NODE_ENV,
            buildBucket: Resource["mv-build-bucket-dev"].name
        }));
    }

    public async getMultiverse(): Promise<IMultiverse> {
        return this.multiverse;
    }
}