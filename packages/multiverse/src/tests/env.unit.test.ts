it("should load env variables", () => {
    const { env } = process;
    expect(env.AWS_ECR).toBeDefined();
});