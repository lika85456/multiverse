---
sidebar_position: 2
---

# GitHub
GitHub requires the domain of the deployed application, so you cannot use it locally. In `Settings/Developer settings/OAuth Apps`
create a new OAuth App `Multiverse`. Fill in the form with your application:
- the `Homepage URL`, where you provide your deployed application domain;
- and the `Authorization callback URL`. Fill in the `GITHUB_ID` and `GITHUB_SECRET` keys.

Then, when the application is created, use `Generate a new client secret` to generate the `GITHUB_SECRET`.
Fill the keys `GITHUB_ID` and `GITHUB_SECRET` in the related `.env` file.