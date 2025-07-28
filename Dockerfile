FROM node:18-alpine

# Set environment variables
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm install --only=production

# Copy compiled JavaScript files
COPY dist/ ./dist/

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "dist/server.js"] 