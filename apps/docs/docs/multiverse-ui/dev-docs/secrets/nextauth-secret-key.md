---
sidebar_position: 1
---

# NextAuth secret key

To set `NEXTAUTH_SECRET_KEY` you can use any random string. It is used for encrypting the session. For better security,
you can quickly generate a random string using the following command:

```bash
openssl rand -base64 32
```