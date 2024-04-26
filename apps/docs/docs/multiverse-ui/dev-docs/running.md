---
sidebar_position: 2
---

# Running Multiverse UI

To run Multiverse UI, you need to have installed `Node.js (v20)` and `pnpm`. You will also need a `Docker` with `MongoDB`.
Before running the application, there are some steps you will need to take. First, you need to install all dependencies.
Fill in the `.env` file with your configuration. Then you can run the application.

NOTE: Root `.env` file is used for the deployment of the application. The `apps/multiverse-ui/.env` file is used for running the application locally.

## Local environment

To run the application locally, you will need to fill in the `apps/multiverse-ui/.env` file with your configuration.
All keys provided in the `apps/multiverse-ui/.env.example` need to be filled. This environment configuration is used for
running the application locally.

## Deployment environment

During deployment the `apps/multiverse-ui/.env` file will be used. If you don't have global AWS credentials environment
variable set up, you will also need to provide the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the root `.env` file.

## Environment configuration

Environment consists of multiple variables. All the variables (as defined in the `.env.example` file) are required.
Configuration of each variable is described below.