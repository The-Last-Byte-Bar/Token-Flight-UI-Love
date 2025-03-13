FROM node:18-alpine as builder

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Use our custom script to modify tsconfig.json
COPY docker-ts-config.js ./
RUN node docker-ts-config.js

# Run TypeScript build
RUN npm run build

# Production stage
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built app from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy data folder if it exists
COPY --from=builder /usr/src/app/data ./data

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"] 