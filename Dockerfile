# Build Stage
FROM public.ecr.aws/lambda/nodejs:18 AS build

# Install required dependencies
RUN yum install -y amazon-linux-extras && \
    amazon-linux-extras enable python3.8 && \
    yum install -y python38 make gcc-c++ unzip && \
    yum clean all && \
    rm -rf /var/cache/yum

# Ensure Python 3.8 is available
ENV PYTHON="/usr/bin/python3"
RUN ln -sf /usr/bin/python3.8 /usr/bin/python

# Install Bun globally
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# Set working directory
WORKDIR /var/task

# Copy the project files into the container
COPY . .

# Install development dependencies and build the app
RUN bun install
RUN bun run build:db

# Run Stage
FROM public.ecr.aws/lambda/nodejs:18 AS run

# Set working directory
WORKDIR /var/task

# Install only necessary runtime dependencies
RUN yum install -y amazon-linux-extras && \
    amazon-linux-extras enable python3.8 && \
    yum install -y python38 unzip && \
    yum clean all && \
    rm -rf /var/cache/yum

# Ensure Python 3.8 is available
ENV PYTHON="/usr/bin/python3"
RUN ln -sf /usr/bin/python3.8 /usr/bin/python

# Copy required files from the build stage
COPY --from=build /var/task/package.json .
COPY --from=build /var/task/packages/multiverse/src/Compute/dist/index.js ./packages/multiverse/src/Compute/dist/index.js
COPY --from=build /var/task/bun.lock .
COPY --from=build /var/task/node_modules ./node_modules

# Define the command to run your Lambda function
CMD ["packages/multiverse/src/Compute/dist/index.handler"]
