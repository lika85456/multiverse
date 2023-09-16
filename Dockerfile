# Build Stage
FROM public.ecr.aws/lambda/nodejs:18 AS build

# Install build dependencies
RUN yum install -y python3 make gcc-c++ && \
    yum clean all && \
    rm -rf /var/cache/yum

# Install pnpm globally
RUN npm install -g pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set working directory
WORKDIR /var/task

# Copy the project files into the container
COPY . .

# Install development dependencies and build the app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build:db

# Run Stage
FROM public.ecr.aws/lambda/nodejs:18 AS run

# Set working directory
WORKDIR /var/task

# Install hnswlib build dependencies
RUN yum install -y python3 make gcc-c++ && \
    yum clean all && \
    rm -rf /var/cache/yum

# Copy the package.json and Database.js from the build stage
COPY --from=build /var/task/package.json .
COPY --from=build /var/task/packages/multiverse/src/Database/dist/Database.js ./packages/multiverse/src/Database/dist/Database.js
COPY --from=build /var/task/pnpm-workspace.yaml .
COPY --from=build /var/task/pnpm-lock.yaml .

# Install only production dependencies using pnpm
RUN npm install -g pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN pnpm install --prod --frozen-lockfile

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV CHANGES_TABLE=${CHANGES_TABLE}
ENV SNAPSHOT_BUCKET=${SNAPSHOT_BUCKET}
ENV INDEX_CONFIG=${INDEX_CONFIG}
ENV PARTITION=${PARTITION}

# Define the command to run your Lambda function
CMD ["packages/multiverse/src/Database/dist/Database.handler"]
