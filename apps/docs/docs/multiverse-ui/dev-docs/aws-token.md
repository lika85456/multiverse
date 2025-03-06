---
sidebar_position: 3
---

# AWS accessKeyId and secretAccessKey

To generate `accessKeyId` and `secretAccessKey` (`awsToken` for short), you will need to have an [Amazon Web Services (AWS)](https://aws.amazon.com/) account.
From the [IAM](https://console.aws.amazon.com/iam/) navigate to `Manage access keys -> Access keys` and create a new access key.
Save your generated credentials in a safe place. Fill in the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the root `.env` file.

This AWS Token will be used to deploy the application with the [SST](https://sst.dev/).

You may generate up to 2 active access keys per account. You can use the same access key for deployment and for the user's
AWS Token when using the application. All users will have to generate their own AWS Token and provide it in the application.