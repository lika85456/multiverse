# Welcome to Multiverse

This project is a bachelor thesis of Michal Kornúc (Multiverse UI part) and Vojtěch Jedlička (Multiverse Library part).
The consulter and leader of this project is Ing. Jan Blizničenko from the 
[Faculty of Information Technology at Czech Technical University in Prague](https://fit.cvut.cz/cs).

App is deployed at [d2l3pgy3g16qpx.cloudfront.net](https://d2l3pgy3g16qpx.cloudfront.net/). 
If the page is not available, it was probably taken down due to the costs of running the application.

Multiverse is a platform for managing and querying vector data. It is a platform that allows users to store, manage, and
query vector data. The platform is divided into two parts: Multiverse Library and Multiverse UI. 

The Multiverse Library is a backend application that provides the core functionality of the platform, like creating
databases, adding vectors, querying vectors, and more.

The Multiverse UI is a frontend application that provides a user interface for interacting with the platform.

Multiverse runs on AWS and uses the following services:
- AWS Lambda
- AWS S3
- AWS DynamoDB
- AWS SQS
- AWS SES
- AWS Cost Explorer
- AWS IAM

It is deployed using the [Serverless Stack Framework (SST)](https://sst.dev/).
Platform currently does not contain payment functionality, it is free to use. However, Multiverse Library runs in users 
AWS account and costs are billed directly to the user's AWS account. Expected costs can be calculated in the Multiverse UI.

# Multiverse Library

Will be provided by Vojtěch Jedlička.

# Multiverse UI

Web UI for Multiverse. Allows user account management. This application is a wrapper over Multiverse Library.
It also add extra features, like AWS Token management and usage statistics.

## Running Multiverse UI

To run Multiverse UI, you need to have installed `Node.js (v20)` and `pnpm`. You will also need a `Docker` with `MongoDB`.
Before running the application, there are some steps you will need to take. First, you need to install all dependencies.
Fill in the `.env` file with your configuration. Then you can run the application. 

NOTE: Root `.env` file is used for the deployment of the application. The `apps/multiverse-ui/.env` file is used for running the application locally.

### Local environment

To run the application locally, you will need to fill in the `apps/multiverse-ui/.env` file with your configuration.
All keys provided in the `apps/multiverse-ui/.env.example` need to be filled. This environment configuration is used for
running the application locally.

### Deployment environment

During deployment the `apps/multiverse-ui/.env` file will be used. If you don't have global AWS credentials environment
variable set up, you will also need to provide the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the root `.env` file.

### Environment configuration

Environment consists of multiple variables. All the variables (as defined in the `.env.example` file) are required.
Configuration of each variable is described below.

#### AWS accessKeyId and secretAccessKey

To generate `accessKeyId` and `secretAccessKey` (`awsToken` for short), you will need to have an [Amazon Web Services (AWS)](https://aws.amazon.com/) account.
From the [IAM](https://console.aws.amazon.com/iam/) navigate to `Manage access keys -> Access keys` and create a new access key.
Save your generated credentials in a safe place. Fill in the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the root `.env` file.

This AWS Token will be used to deploy the application with the [SST](https://sst.dev/).

You may generate up to 2 active access keys per account. You can use the same access key for deployment and for the user's
AWS Token when using the application. All users will have to generate their own AWS Token and provide it in the application.

#### Google

In your [google cloud console](`https://console.cloud.google.com/apis/credentials`) create a new project Multiverse. 
There set up your credentials. Provide:
- Authorized JavaScript origins (`http://[domain]`) and; 
- Authorized redirect URIs (`http://[domain]/api/auth/callback/google` and `https://[domain]/api/auth/callback/google`). 

In local development use the domain `localhost:3000`, in production use the domain of your deployed application.
Finally, fill in the `GOOGLE_ID` and `GOOGLE_SECRET` keys in the related `.env` file.

#### GitHub
GitHub requires the domain of the deployed application, so you cannot use it locally. In `Settings/Developer settings/OAuth Apps` 
create a new OAuth App `Multiverse`. Fill in the form with your application: 
  - the `Homepage URL`, where you provide your deployed application domain; 
  - and the `Authorization callback URL`. Fill in the `GITHUB_ID` and `GITHUB_SECRET` keys.

Then, when the application is created, use `Generate a new client secret` to generate the `GITHUB_SECRET`.
Fill the keys `GITHUB_ID` and `GITHUB_SECRET` in the related `.env` file.

#### SSO with AWS SES

To enable SSO authentication, you will have to set up a `SES email service`. To achieve that, you will need to have an 
[Amazon Web Services (AWS)](https://aws.amazon.com/) account. In the [Amazon SES](https://eu-central-1.console.aws.amazon.com/) open the `Configuration/Identities` tab to create a 
new identity. Choose the domain of your application or provide an email. If you choose the email, you will need to verify
it to send emails from it. To email another email, you will need to verify it as well. This is a security measure, since 
your SES is still in the sandbox mode. To send emails to any email, you will need to request a production access.

Then in the `Configuration/SMTP settings` you will have to create a new SMTP credentials. Provide User name or just use 
the default one. Store the access key and secret key. This variable will not be shown again, so store it in a safe place.
Fill in the `SMTP_USER` and `SMTP_PASSWORD` keys in the related `.env` file with the credentials. `SMTP_HOST` and 
`SMTP_PORT` are provided in the SMTP settings.

#### MongoDB

You will need to have a running MongoDB instance. In production, you will have to create your own MongoDB database in 
[Mongo Atlas](https://cloud.mongodb.com/). More about using MongoDB Atlas can be found in the [MongoDB Atlas documentation](https://www.mongodb.com/docs/atlas/). In development, 
create mongodb in Docker or use the cloud MongoDB database in Mongo Atlas. Copy the connection string (with credentials 
if needed) and fill in the `MONGODB_URI` variable in the `apps/multiverse-ui/.env` file.

#### NextAuth secret key

To set `NEXTAUTH_SECRET_KEY` you can use any random string. It is used for encrypting the session. For better security, 
you can quickly generate a random string using the following command:

```bash
openssl rand -base64 32
```

#### Secret key

To set `SECRET_KEY` have to use a hex sting of length 32. You can generate it using the following command:

```bash
openssl rand -hex 16
```

#### Running Multiverse UI - development (uses MultiverseMock instead of Multiverse)

Make sure to set the `NODE_ENV` variable to `development` in the related `.env` file and provide `MONGODB_URI` connection 
string to running development database instance. Set other keys as well.

NOTE: costs calculation in development mode is disabled to prevent unnecessary costs, since Cost Explorer API is expensive (0.01$ per request).

```bash
cd apps/multiverse-ui #if not already in the directory
pnpm i
pnpm dev
```

#### Running Multiverse UI - production (uses Multiverse)

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

### Deploying Multiverse UI

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

### Common issues
Some of the most common issues encountered during the development and deployment of the application are listed below.

#### Deployed application throws 504 error
- don't panic, it's just the application starting up
- try to refresh the page or switch to another page (/login, /pricing)
- if the problem persists, close the tab and open the application in a new tab
- otherwise check the logs in the AWS CloudWatch for the Next.js server lambda

#### Provider not working correctly
- check if the domain is authorized in the provider
- check your credentials for the problematic provider

#### Application not working correctly
- check the `NODE_ENV` variable in the `.env` file (might be set to `development` instead of `production`)
- double-check the environment variables

#### Authentication fails
- check the `NEXTAUTH_URL` variable in the `.env` file
- check the `MONGODB_URI` variable in the `.env` file
- check if the identity you are using (email address to send email from/to) is verified in the SES
- check your credentials for the problematic providers

#### Deployment fails
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

#### Multiverse functionality (creating database, adding vector, querying, etc.) fails
- make sure to have the orchestrator built:
    
```bash
pnpm build:orchestrator
```

#### Other issues
- check the logs in the AWS CloudWatch for the lambda. In AWS find AWS Lambda, open tab Functions, select the lambda with desired
name (check your stage, lambda should also have description Next.js server and prefix with the stage name), open the tab Monitor
and click on the View logs in CloudWatch. Check the logs for any errors.
- try to run the application locally in the production mode to specify the issue
- check logs in the terminal if running the application locally
- google? stackoverflow? ask your colleagues? read the documentation? again? :)
- good luck otherwise... :(