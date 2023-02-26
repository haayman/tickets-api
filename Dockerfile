FROM node:16-alpine

# Configure NodeJs environment variables
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Create working directory
WORKDIR /app


# Copy application information
COPY package*.json ./

RUN npm install

COPY . .
