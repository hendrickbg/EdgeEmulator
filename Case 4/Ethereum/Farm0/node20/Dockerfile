FROM ethereum/client-go:v1.11.6

WORKDIR /app

COPY node /app/node20
RUN echo "123456" > /app/password.txt

ENTRYPOINT ["geth"]