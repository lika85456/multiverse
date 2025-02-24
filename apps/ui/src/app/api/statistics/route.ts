import { ENV } from "@/lib/env";
import { start } from "@/lib/statistics-processor";

const handler = async() => {
    if (ENV.NODE_ENV !== "development") {
        return new Response("Not found", { status: 404 });
    }
    try {
        const message = await start();

        return new Response(message, { status: 200 });
    } catch (error) {
        return new Response("Internal server error", { status: 500 });
    }
};

export { handler as POST };