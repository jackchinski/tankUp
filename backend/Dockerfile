FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json* ./
COPY tsconfig.json ./
COPY prisma ./prisma

# Install dependencies (this will install the exact Prisma version from package.json)
RUN npm ci

# Generate Prisma Client (using the installed version from node_modules)
RUN ./node_modules/.bin/prisma generate

# Copy source code
COPY src ./src

# Expose port
EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]

