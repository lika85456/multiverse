export const databases = [
    {
        name: "Production chatbot 1",
        codeName: "prod1_eu_central_af2e8",
        locality: "eu-central",
        records: 2500000,
        dimensions: 1536,
        metrics: "Dot Product",
    },
    {
        name: "test 1",
        codeName: "test1_eu_central_af2e7",
        locality: "eu-central",
        records: 317,
        dimensions: 1536,
        metrics: "Euclidean Distance",
    },
    {
        name: "test 2",
        codeName: "test2_eu_central_af2e6",
        locality: "eu-central",
        records: 5300000,
        dimensions: 3072,
        metrics: "Cosine Similarity",
    },
    {
        name: "test 3",
        codeName: "test3_eu_central_af2e5",
        locality: "eu-central",
        records: 69,
        dimensions: 420,
        metrics: "Cosine Similarity",
    },
];

export const tokens = [
    {
        tokenId: "1",
        databaseCodeName: "prod1_eu_central_af2e8",
        name: "Token 1",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
    {
        tokenId: "2",
        databaseCodeName: "prod1_eu_central_af2e8",
        name: "Token 2",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
    {
        tokenId: "3",
        databaseCodeName: "prod1_eu_central_af2e8",
        name: "Token 3",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
    {
        tokenId: "4",
        databaseCodeName: "test1_eu_central_af2e7",
        name: "Token 4",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
    {
        tokenId: "5",
        databaseCodeName: "test1_eu_central_af2e7",
        name: "Token 5",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
    {
        tokenId: "6",
        databaseCodeName: "prod1_eu_central_af2e8",
        name: "Token 6",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
    {
        tokenId: "7",
        databaseCodeName: "test2_eu_central_af2e6",
        name: "Token 7",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
    {
        tokenId: "8",
        databaseCodeName: "test3_eu_central_af2e5",
        name: "Token 8",
        tokenData: "725e6ca495fd5957",
        validity: Date.now(),
    },
];

export const dummyData = {
    databases,
    tokens,
};