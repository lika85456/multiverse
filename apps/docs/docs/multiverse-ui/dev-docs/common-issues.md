---
sidebar_position: 8
---

# Common issues
Some of the most common issues encountered during the development and deployment of the application are listed below.

## Deployed application throws 504 error
- don't panic, it's just the application starting up
- try to refresh the page or switch to another page (/login, /pricing)
- if the problem persists, close the tab and open the application in a new tab
- otherwise check the logs in the AWS CloudWatch for the Next.js server lambda

## Provider not working correctly
- check if the domain is authorized in the provider
- check your credentials for the problematic provider

## Application not working correctly
- check the `NODE_ENV` variable in the `.env` file (might be set to `development` instead of `production`)
- double-check the environment variables

## Authentication fails
- check the `NEXTAUTH_URL` variable in the `.env` file
- check the `MONGODB_URI` variable in the `.env` file
- check if the identity you are using (email address to send email from/to) is verified in the SES
- check your credentials for the problematic providers

## Deployment fails
- `...[fn] is not a function...`? remove all node_modules you can find in the project and run:

```bash
pnpm i
pnpm build:orchestrator
pnpm sst deploy # (--stage prod) if you are deploying to the prod stage
```
- if the problem persists, also remove package-lock.yaml and reinstall the packages with `pnpm i`
  (source: [`Stack overflow: EndpointFunctions[fn] is not a function #5435`](https://github.com/aws/aws-sdk-js-v3/issues/5435))
- make sure to build the orchestrator
- make sure to fix any issues in the code which might break the build of the multiverse-ui

## Multiverse functionality (creating database, adding vector, querying, etc.) fails
- make sure to have the orchestrator built:

```bash
pnpm build:orchestrator
```

## Other issues
- check the logs in the AWS CloudWatch for the lambda. In AWS find AWS Lambda, open tab Functions, select the lambda with desired
  name (check your stage, lambda should also have description Next.js server and prefix with the stage name), open the tab Monitor
  and click on the View logs in CloudWatch. Check the logs for any errors.
- try to run the application locally in the production mode to specify the issue
- check logs in the terminal if running the application locally
- google? stackoverflow? ask your colleagues? read the documentation? again? :)
- good luck otherwise... :(