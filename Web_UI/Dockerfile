FROM node:20-alpine

WORKDIR /app

# Install network tools for health checks (curl as fallback, netcat for reliability)
RUN apk add --no-cache curl netcat-openbsd

# Copy package files
COPY package*.json ./

# Update npm to latest version and install dependencies with cache mounting
RUN --mount=type=cache,target=/root/.npm \
    npm install -g npm@latest && \
    npm install --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Create health check script for API endpoint check
RUN printf '#!/bin/sh\n# Wait for app to start, then check health\nsleep 5\nnode -e "\nconst http = require('"'"'http'"'"');\nconst req = http.get('"'"'http://localhost:3000/api/health'"'"', (res) => {\n  console.log('"'"'Health check status:'"'"', res.statusCode);\n  process.exit(res.statusCode === 200 ? 0 : 1);\n});\nreq.on('"'"'error'"'"', (err) => {\n  console.log('"'"'Health check error:'"'"', err.message);\n  process.exit(1);\n});\nreq.setTimeout(5000, () => {\n  console.log('"'"'Health check timeout'"'"');\n  req.destroy();\n  process.exit(1);\n});\n"\n' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

# Create simple port check script
RUN printf '#!/bin/sh\nnc -z localhost 3000\n' > /usr/local/bin/healthcheck-simple.sh && \
    chmod +x /usr/local/bin/healthcheck-simple.sh

# Start the application
CMD ["npm", "start"] 