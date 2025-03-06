---
sidebar_position: 1
---

# Google

In your [google cloud console](`https://console.cloud.google.com/apis/credentials`) create a new project Multiverse.
There set up your credentials. Provide:
- Authorized JavaScript origins (`http://[domain]`) and;
- Authorized redirect URIs (`http://[domain]/api/auth/callback/google` and `https://[domain]/api/auth/callback/google`).

In local development use the domain `localhost:3000`, in production use the domain of your deployed application.
Finally, fill in the `GOOGLE_ID` and `GOOGLE_SECRET` keys in the related `.env` file.