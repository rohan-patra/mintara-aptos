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

# Install Letta for TEE support
RUN mkdir -p ~/.letta/.persist/pgdata
RUN pip3 install letta
ENV LETTA_HOME="/root/.letta"

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

# Configure for TEE and Letta
ENV TEE_ENABLED=1
ENV NODE_ENV=production
ENV SECURE=true
ENV LETTA_SERVER_PASSWORD=${LETTA_SERVER_PASSWORD:-lettapassword}
ENV PGDATA="/var/lib/postgresql/data"

# Copy from base
WORKDIR /app
COPY --from=base /app .
COPY --from=base /root/.letta /root/.letta

# Create entrypoint script
RUN echo '#!/bin/bash\n\
# Start Letta server in background\n\
nohup letta server --port 8283 --host 0.0.0.0 &\n\
# Wait for Letta server to start\n\
sleep 5\n\
# Start application services\n\
cd /app/agent && bun start & \n\
cd /app/frontend && npm start\n\
wait' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expose ports
EXPOSE 3000 3001 8283

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]