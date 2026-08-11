# Use the official Bun image as the base
FROM oven/bun:1-slim AS base

# Set the working directory
WORKDIR /app

# Copy package.json and lock files first (for better caching)
COPY package.json ./

# Install dependencies (this runs 'bun install')
RUN bun install

# Copy the rest of your application source code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Start the server using Bun
CMD ["bun", "run", "./src/server.ts"]