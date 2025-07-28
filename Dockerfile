FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    && npm install \
    && apk del .build-deps

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "dist/server.js"] 