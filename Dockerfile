FROM node:20-slim

WORKDIR /app

# Install all dependencies (including devDeps for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Remove devDependencies after build
RUN npm prune --omit=dev

# Railway sets PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
