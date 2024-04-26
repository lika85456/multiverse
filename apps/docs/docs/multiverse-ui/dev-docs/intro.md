---
sidebar_position: 1
---

# Introduction

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