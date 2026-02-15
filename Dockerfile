# Development stage
FROM node:22-alpine AS development

WORKDIR /app

# Atualizar npm para versão 11 (melhor resolução de peer deps)
RUN npm install -g npm@latest

# Install postgresql-client for healthcheck
RUN apk add --no-cache postgresql-client

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Create startup script (includes prisma migrate deploy and seed)
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🔧 Aguardando serviços..."' >> /app/start.sh && \
    echo 'sleep 5' >> /app/start.sh && \
    echo 'echo "🚀 Executando migrations..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "🌱 Executando seed..."' >> /app/start.sh && \
    echo 'npm run prisma:seed || true' >> /app/start.sh && \
    echo 'echo "✅ Iniciando aplicação..."' >> /app/start.sh && \
    echo 'npm run start:dev' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start with migrations and seed
CMD ["/app/start.sh"]

# Builder stage
FROM node:22-alpine AS builder

WORKDIR /app

# Atualizar npm para versão 11
RUN npm install -g npm@latest

# Install postgresql-client
RUN apk add --no-cache postgresql-client

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Atualizar npm para versão 11
RUN npm install -g npm@latest

# Install postgresql-client for healthcheck
RUN apk add --no-cache postgresql-client

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🔧 Aguardando serviços..."' >> /app/start.sh && \
    echo 'sleep 5' >> /app/start.sh && \
    echo 'echo "🚀 Executando migrations..."' >> /app/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/start.sh && \
    echo 'echo "🌱 Executando seed..."' >> /app/start.sh && \
    echo 'npm run prisma:seed || true' >> /app/start.sh && \
    echo 'echo "✅ Iniciando aplicação..."' >> /app/start.sh && \
    echo 'node dist/main' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start application
CMD ["/app/start.sh"]
