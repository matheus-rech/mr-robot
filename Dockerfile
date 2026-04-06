# Multi-stage build for optimal image size
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install production dependencies for better-sqlite3 (needs build tools)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy necessary files
COPY .env.example ./.env.example

# Create directory for data persistence
RUN mkdir -p /data && \
    ln -s /data/mr-robot.db /app/mr-robot.db && \
    ln -s /data/baileys_auth_info /app/baileys_auth_info

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/mr-robot.db

# Expose health check port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Run as non-root user
RUN addgroup -g 1001 -S mrrobot && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G mrrobot -g mrrobot mrrobot && \
    chown -R mrrobot:mrrobot /app /data

USER mrrobot

CMD ["node", "dist/index.js"]
