export type CollectionId = string;

type MultiverseArgs = {
    name: string;
    region: string;
    index:{
        dimensions: number;
    } & ({ 
        type: "static"
        collectionId: CollectionId;
    } | {
        type: "dynamic";
        expectedSize?: number;
    });
    fallbackRegions: string[];
    /**
     * Number of physical lambda functions created in the main region.
     */
    mainRegionRealConcurrency: number;
    /**
     * Number of lambda instances per physical lambda function in the main region.
     */
    mainRegionWarmConcurrency: number;
    warmInterval: number;
};

class MultiverseDB {
    static async create(args: MultiverseArgs): MultiverseDB {
    }
}