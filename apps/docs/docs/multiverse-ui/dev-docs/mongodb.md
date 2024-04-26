---
sidebar_position: 5
---

# MongoDB

You will need to have a running MongoDB instance. In production, you will have to create your own MongoDB database in
[Mongo Atlas](https://cloud.mongodb.com/). More about using MongoDB Atlas can be found in the [MongoDB Atlas documentation](https://www.mongodb.com/docs/atlas/). In development,
create mongodb in Docker or use the cloud MongoDB database in Mongo Atlas. Copy the connection string (with credentials
if needed) and fill in the `MONGODB_URI` variable in the `apps/multiverse-ui/.env` file.