---
sidebar_position: 1
---

# Running Multiverse UI

## Running Multiverse UI - development (uses MultiverseMock instead of Multiverse)

Make sure to set the `NODE_ENV` variable to `development` in the related `.env` file and provide `MONGODB_URI` connection
string to running development database instance. Set other keys as well.

NOTE: costs calculation in development mode is disabled to prevent unnecessary costs, since Cost Explorer API is expensive (0.01$ per request).

```bash
cd apps/multiverse-ui #if not already in the directory
pnpm i
pnpm dev
```

## Running Multiverse UI - production (uses Multiverse)

Make sure to set the `NODE_ENV` variable to `production` in the related `.env` file and provide `MONGODB_URI` connection string
to running production database instance. Set other keys as well.

```bash
pnpm build:orchestrator # in the root of the project
cd apps/multiverse-ui
pnpm i
pnpm build
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
