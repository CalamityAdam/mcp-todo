# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p /data

# Set user to non-root
USER node

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "dist/http.js"]