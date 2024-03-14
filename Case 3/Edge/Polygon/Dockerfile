# Use the Node.js 18 Alpine image as base
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json /app
RUN npm install

# Install required packages for IPFS
RUN apk add gcompat

# Install IPFS
RUN wget https://dist.ipfs.tech/kubo/v0.18.1/kubo_v0.18.1_linux-amd64.tar.gz && \
    tar -xvzf kubo_v0.18.1_linux-amd64.tar.gz && \
    ./kubo/install.sh

# Copy the entire app directory into the container
COPY . /app

# Initialize IPFS and copy configuration
RUN ipfs init
RUN cp /app/config ~/.ipfs/

CMD ["/bin/sh", "-c", "ipfs daemon & ifconfig & npm start"]