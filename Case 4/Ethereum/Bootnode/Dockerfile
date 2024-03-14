FROM ubuntu:latest

WORKDIR /app

COPY bootnode.key /app/bootnode.key

# set up the package repo and install necessary tools
RUN apt-get update -y && apt-get install -y software-properties-common && add-apt-repository -y ppa:ethereum/ethereum && apt-get update -y && apt-get install -y vim bash wget sudo tree net-tools inetutils-ping ethereum

CMD ["/bin/bash"]
