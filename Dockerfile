FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies for both root and server
RUN npm ci
RUN cd server && npm ci

# Copy source files
COPY . .

# Build the frontend
RUN npm run build

# Remove service account key file for security
RUN rm -f server/google-cloud-key.json

# Use PORT environment variable that Cloud Run provides
ENV PORT=8080
EXPOSE 8080

# Use production command
CMD ["npm", "run", "start"]