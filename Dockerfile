FROM node:22.14.0-alpine

# Upgrade npm to 11.7.0
RUN npm install -g npm@11.7.0

WORKDIR /app

# Copy package files for better Docker layer caching
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Install server dependencies
RUN cd server && npm ci && cd ..

# Copy source files
COPY . .

# Build the frontend
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm ci --omit=dev && npm cache clean --force
RUN cd server && npm ci --omit=dev && cd ..

# Clean up unnecessary files for smaller image
RUN rm -rf node_modules/.cache \
    && rm -f server/google-cloud-key.json \
    && rm -f .env \
    && rm -f .env.example

# Use PORT environment variable that Cloud Run provides
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Health check for Cloud Run - extended start period for better reliability
HEALTHCHECK --interval=30s --timeout=15s --start-period=120s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider --timeout=10 http://localhost:$PORT/api/health || exit 1

# Use production command with error handling
CMD ["sh", "-c", "echo 'Starting container...' && npm run start"]