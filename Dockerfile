FROM ubuntu:22.04 as base

# Install dependencies for TEE support
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ca-certificates \
    git \
    gnupg \
    lsb-release \
    build-essential \
    python3 \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy the entire project
COPY . .

# Install and build frontend
WORKDIR /app/frontend
RUN npm ci
RUN npm run build

# Install and build agent
WORKDIR /app/agent
RUN bun install
RUN bun run build

# Start services with TEE configs
FROM base as runtime

# Configure for TEE
ENV TEE_ENABLED=1
ENV NODE_ENV=production

# Copy from base
WORKDIR /app
COPY --from=base /app .

# Create entrypoint script
RUN echo '#!/bin/bash\n\
cd /app/agent && bun start & \n\
cd /app/frontend && npm start\n\
wait' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expose ports
EXPOSE 3000 3001

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]