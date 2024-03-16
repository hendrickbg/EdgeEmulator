# Use the Node.js 18 Alpine image as base
FROM node:18-alpine
# USER root

# Set working directory inside the container
WORKDIR /app

#############################################
# Install IPFS
RUN apk add gcompat

# Copy the entire app directory into the container
COPY . /app

RUN tar -xvzf /app/IPFS/kubo_v0.18.1_linux-amd64.tar.gz && \
    ./kubo/install.sh

# COPY config /app/config

RUN ipfs init
# RUN cp /app/config ~/.ipfs/
#############################################

# Copy package.json and install dependencies
COPY package.json /app
# RUN npm install

# # Install jq
RUN apk --no-cache add jq

# Define the new Swarm option
ENV JSON_FILE_PATH /root/.ipfs/config

# Execute jq command directly in the Dockerfile to update the JSON file
# RUN jq --argjson new_swarm '["/ip4/0.0.0.0/udp/4001/quic","/ip6/::/udp/4001/quic"]' '.Addresses.Swarm = $new_swarm' "$JSON_FILE_PATH" > temp.json && \
#     mv temp.json "$JSON_FILE_PATH"

# RUN npm install -g npm@10.5.0

# CMD ["npm", "start"]
CMD ["/bin/sh", "-c", "ipfs daemon & npm start"]