# Environment

Since we are using multiple environments and deployment methods, we need to have a way to manage the environment variables in a consistent way. We are using the `dotenv` package to load the environment variables from a `.env` file and the `zod` package to **validate** the environment variables.

```typescript
import z from "zod";
import { prettifyIssues } from "@multiverse/env";
import { config } from "dotenv";
import path from "path";

config({ path: path.join(__dirname, "..", "..", "..", process.env.NODE_ENV === "test" ? ".env.test" : ".env"), });

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    TEST_COLLECTIONS_BUCKET: z.string(),
});

export const getEnvIssues = (): z.ZodIssue[] => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) return result.error.issues;
    return [];
};

const issues = getEnvIssues();
prettifyIssues(issues);

export const ENV = envSchema.parse(process.env);
```

The previous snippet exports the `ENV` object with the validated environment variables. If there are any issues with the environment variables, the `prettifyIssues` function will log them in a human-readable way.