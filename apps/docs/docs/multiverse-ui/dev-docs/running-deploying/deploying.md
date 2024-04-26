---
sidebar_position: 2
---

# Deploying Multiverse UI

Deployment has to be done in two steps. Since some of the environment variables are depending on the domain of deployed
application, it is not possible to provide them at first deployment. After deploying the application, provide the domain
into your environment variables and don't forget to `authorize the domain` in all providers (Google, GitHub).

Deploying is done from the root of the project. You will need to have the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
variables set in the root `.env` file.Make sure to provide all other keys as well. At second deployment, make sure to not
leave any variable with value related to the development environment. Switch to the production environment by setting the
`NODE_ENV` variable to `production`.

```bash
pnpm i
pnpm build:orchestrator
pnpm sst deploy # by default it deploys to the `dev` stage
```

To deploy to the `prod` stage, use the following command:

```bash
pnpm sst deploy --stage prod
```

After the deployment is done, you will see the URL of the deployed application and URL of the deployed documentation.
Open it in your browser to see the result. As you might notice, the application is not fully functional yet.
You will need to provide the domain of the deployed application to the environment variables and `authorize the domain`
in ALL providers (Google, GitHub).

After doing so, redeploy the application:

```bash
pnpm sst deploy # (--stage prod) if you are deploying to the prod stage
```

NOTE: First deploy is usually longer (~10-15 minutes). Subsequent deploys are faster (~5 minutes). When first using the
deployed application, it might be a little bit slower, since the application is starting up and it's not cached.
