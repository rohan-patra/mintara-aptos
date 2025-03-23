# Mintara Aptos Project

A secure, TEE-enabled application combining a Next.js frontend and a TypeScript/Bun agent for Aptos blockchain interaction.

## Project Structure

This project consists of three main components:

- **Frontend**: A Next.js application for user interaction
- **Agent**: A TypeScript/Bun service for backend processing and API integration
- **TEE Environment**: Secure execution environment using Letta for trusted computing

## Prerequisites

- Docker
- Docker Compose (optional)

## Quick Start

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/mintara-aptos.git
   cd mintara-aptos
   ```

2. Build and run with Docker:

   ```
   docker build -t mintara-tee .
   docker run -p 3000:3000 -p 3001:3001 -p 8283:8283 mintara-tee
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Agent API: http://localhost:3001
   - Letta Server: http://localhost:8283

## Environment Variables

You can customize the application by setting the following environment variables:

```
# TEE Configuration
TEE_ENABLED=1
LETTA_SERVER_PASSWORD=your_custom_password

# Add other environment variables as needed for your specific implementation
```

## Development

### Frontend (Next.js)

The frontend is located in the `frontend/` directory and is built with Next.js, React, and Tailwind CSS.

To run the frontend in development mode:

```
cd frontend
bun install
bun run dev
```

### Agent (TypeScript/Bun)

The agent service is located in the `agent/` directory and is built with TypeScript and Bun.

To run the agent in development mode:

```
cd agent
bun install
bun run dev
```

## Trusted Execution Environment (TEE)

This project utilizes a TEE environment with Letta for secure execution, ensuring that sensitive operations are performed in an isolated and trusted context.

## License

[Add your license information here]

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
