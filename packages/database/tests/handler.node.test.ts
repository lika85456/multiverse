import { handler } from "../src";

describe("Handler", () => {
    it("handles", async() => {
        const res = await handler({} as any, {} as any);

        expect(res.statusCode).toBe(200);
    });
});