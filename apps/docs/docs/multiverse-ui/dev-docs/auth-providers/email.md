---
sidebar_position: 3
---

# SSO with AWS SES

To enable SSO authentication, you will have to set up a `SES email service`. To achieve that, you will need to have an
[Amazon Web Services (AWS)](https://aws.amazon.com/) account. In the [Amazon SES](https://eu-central-1.console.aws.amazon.com/) open the `Configuration/Identities` tab to create a
new identity. Choose the domain of your application or provide an email. If you choose the email, you will need to verify
it to send emails from it. To email another email, you will need to verify it as well. This is a security measure, since
your SES is still in the sandbox mode. To send emails to any email, you will need to request a production access.

Then in the `Configuration/SMTP settings` you will have to create a new SMTP credentials. Provide User name or just use
the default one. Store the access key and secret key. This variable will not be shown again, so store it in a safe place.
Fill in the `SMTP_USER` and `SMTP_PASSWORD` keys in the related `.env` file with the credentials. `SMTP_HOST` and
`SMTP_PORT` are provided in the SMTP settings.