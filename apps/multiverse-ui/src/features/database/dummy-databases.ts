const databases = [
    {
        databaseId: "1",
        name: "Production chatbot 1",
        codename: "prod1_eu_central_af2e8",
        locality: "eu-central",
        records: 2500000,
        dimensions: 1536,
        metrics: "Dot Product",
    },
    {
        databaseId: "2",
        name: "test 1",
        codename: "test1_eu_central_af2e7",
        locality: "eu-central",
        records: 317,
        dimensions: 1536,
        metrics: "Euclidean Distance",
    },
    {
        databaseId: "3",
        name: "test 2",
        codename: "test2_eu_central_af2e6",
        locality: "eu-central",
        records: 5300000,
        dimensions: 3072,
        metrics: "Cosine Similarity",
    },
];

export function getDatabases() {
    return databases;
}

export function getDatabaseById(id: string) {
    return databases.filter((data) => data.databaseId === id)[0];
}