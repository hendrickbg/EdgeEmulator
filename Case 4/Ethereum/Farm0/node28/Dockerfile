FROM ethereum/client-go:v1.11.6

WORKDIR /app

COPY node /app/node28
RUN echo "123456" > /app/password.txt

ENTRYPOINT ["geth"]