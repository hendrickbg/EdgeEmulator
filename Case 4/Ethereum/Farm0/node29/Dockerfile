FROM ethereum/client-go:v1.11.6

WORKDIR /app

COPY node /app/node29
RUN echo "123456" > /app/password.txt

ENTRYPOINT ["geth"]