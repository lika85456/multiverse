FROM public.ecr.aws/lambda/nodejs:18 as builder
WORKDIR /usr/app

# install python
RUN yum install -y python3 make gcc-c++ && \
    yum clean all && \
    rm -rf /var/cache/yum

# install pnpm
RUN npm i -g pnpm

COPY dist .
COPY package.dist.json package.json

# install dependencies
RUN pnpm install

FROM public.ecr.aws/lambda/nodejs:18
WORKDIR ${LAMBDA_TASK_ROOT}

# COPY --from=builder /usr/app ./
# COPY --from=builder /usr/app/dist/* ./

# copy from packages/database/dist
COPY --from=builder /usr/app/ ./

CMD ["index.handler"]

# Command to run container locally (and then destroy the image and container):
# docker build -t lambda-image .
# docker run --rm -p 9000:8080 lambda-image:latest
# curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{"foo": "bar"}'
# docker image rm lambda-image