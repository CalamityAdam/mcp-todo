FROM node:22-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy TypeScript files and build configuration
COPY tsconfig.json ./
COPY src ./src

# Install dev dependencies for building
RUN npm install --save-dev typescript @types/node @types/express

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
