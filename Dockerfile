# # Stage 1: Builder
# FROM public.ecr.aws/lambda/nodejs:18 as builder

# WORKDIR /usr/app

# # Install pnpm
# RUN npm install -g pnpm

# # install python
# RUN yum install -y python3 make gcc-c++ && \
#     yum clean all && \
#     rm -rf /var/cache/yum

# # Copy package.json and pnpm-lock.yaml to enable better caching
# COPY pnpm-lock.yaml .
# COPY pnpm-workspace.yaml .
# COPY package.json .

# COPY packages/multiverse/package.json ./packages/multiverse/
# COPY packages/env/package.json ./packages/env/
# COPY packages/log/package.json ./packages/log/

# # Install dependencies
# RUN pnpm install --frozen-lockfile

# # Copy the entire monorepo
# COPY . .

# # Install dependencies
# RUN pnpm install --frozen-lockfile

# # Build the package
# RUN pnpm run build:db

# # Stage 2: Runtime
# FROM public.ecr.aws/lambda/nodejs:18

# WORKDIR ${LAMBDA_TASK_ROOT}

# # install python
# RUN yum install -y python3 make gcc-c++ && \
#     yum clean all && \
#     rm -rf /var/cache/yum

# # Copy the built package from the builder stage
# # COPY --from=builder /usr/app/packages/database/dist .
# COPY --from=builder /usr/app .

# # Variables
# ENV NODE_ENV=production
# ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
# ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

# # CMD [ "index.handler" ]
# CMD [ "packages/multiverse/src/Database/dist/Database.handler"]

FROM public.ecr.aws/lambda/nodejs:18

RUN yum install -y python3 make gcc-c++ && \
    yum clean all && \
    rm -rf /var/cache/yum

COPY . /var/task/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
RUN pnpm run build:db

CMD [ "packages/multiverse/src/Database/dist/Database.handler" ]