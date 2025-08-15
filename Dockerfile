# BalmSharedMCP Docker Image
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S balm-mcp -u 1001

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=balm-mcp:nodejs /app/dist ./
COPY --from=builder --chown=balm-mcp:nodejs /app/node_modules ./node_modules

# Create necessary directories
RUN mkdir -p /app/logs /app/config && \
    chown -R balm-mcp:nodejs /app/logs /app/config

# Switch to non-root user
USER balm-mcp

# Expose port (if running in HTTP mode)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node src/cli/index.js health --timeout 10 || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command
CMD ["node", "src/index.js"]