# Production Dockerfile for LabPilot
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S labpilot -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies needed for vite imports)
RUN npm ci && npm cache clean --force

# Copy pre-built applications
COPY dist ./dist
COPY shared ./shared

# Create necessary directories
RUN mkdir -p uploads attached_assets && \
    chown -R labpilot:nodejs uploads attached_assets

# Copy startup script
COPY <<EOF /app/start.sh
#!/bin/sh
set -e

# Run database migrations if needed
# npm run db:push

# Start the application
exec node dist/index.js
EOF

RUN chmod +x /app/start.sh && chown labpilot:nodejs /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "http.get('http://localhost:'+process.env.PORT+'/api/health', (res) => { \
        process.exit(res.statusCode === 200 ? 0 : 1); \
    }).on('error', () => process.exit(1));"

# Switch to non-root user
USER labpilot

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start application
CMD ["/app/start.sh"]