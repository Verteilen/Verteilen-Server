FROM ubuntu:noble
WORKDIR /app/

RUN apt update
RUN apt -y install npm nodejs

WORKDIR /app/
EXPOSE 11777
EXPOSE 11080

COPY . .

RUN npm install -g typescript
RUN npm install
RUN tsc
ENTRYPOINT [ "node", "." ]