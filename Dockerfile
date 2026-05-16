# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Vite application (frontend)
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy backend files and necessary configs
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/agents.ts ./
COPY --from=builder /app/lib ./lib
# Copy index.html as a fallback if needed by Express
COPY --from=builder /app/index.html ./

# We need tsx to run server.ts since it's a typescript file
# Note: In a true prod build, server.ts should be compiled to js,
# but we'll use tsx as currently configured in package.json "start" script
RUN npm install tsx --save-dev

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
