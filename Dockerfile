# Stage 1: Builder
FROM public.ecr.aws/lambda/nodejs:18 as builder

WORKDIR /usr/app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml to enable better caching
COPY pnpm-lock.yaml .
COPY package.json .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the entire monorepo
COPY . .

# Build the package
RUN pnpm run build

# Stage 2: Runtime
FROM public.ecr.aws/lambda/nodejs:18

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy the built package from the builder stage
COPY --from=builder /usr/app/packages/database/dist .

CMD [ "index.handler" ]