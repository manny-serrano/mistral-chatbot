FROM node:18-alpine

WORKDIR /app

# Install network tools for health checks (curl as fallback, netcat for reliability)
RUN apk add --no-cache curl netcat-openbsd

# Copy package files
COPY package*.json ./

# Install dependencies with npm (using force to handle peer dependency conflicts)
RUN npm install --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Create multiple health check options
RUN echo '#!/bin/sh\n# Primary: Node.js built-in health check\nnode -e "require(\"http\").get(\"http://localhost:3000/api/health\", (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on(\"error\", () => process.exit(1))" || curl -f http://localhost:3000/api/health || exit 1' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

# Alternative: Pure Node.js health check (no curl dependency)
RUN echo '#!/bin/sh\nnode -e "require(\"http\").get(\"http://localhost:3000/api/health\", (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on(\"error\", () => process.exit(1))"' > /usr/local/bin/healthcheck-node.sh && \
    chmod +x /usr/local/bin/healthcheck-node.sh

# Start the application
CMD ["npm", "start"] 