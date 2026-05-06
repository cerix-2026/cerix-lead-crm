FROM node:20

WORKDIR /app

# Install all dependencies (including devDeps for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Remove devDependencies after build
RUN npm prune --omit=dev

CMD ["node", "server/index.js"]
