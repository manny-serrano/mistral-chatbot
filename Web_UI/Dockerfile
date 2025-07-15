FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

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

# Add health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3000/api/health || exit 1' > /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

# Start the application
CMD ["npm", "start"] 