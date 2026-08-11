# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY . .
RUN npm run db:generate --workspace=backend

# Compile backend (tsc -> backend/dist) and frontend (vite -> frontend/dist)
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Runtime needs the prisma CLI (migrate deploy) which lives in node_modules
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend/dist /app/backend/dist
COPY --from=build /app/backend/prisma /app/backend/prisma
COPY --from=build /app/backend/package.json /app/backend/package.json
COPY --from=build /app/frontend/dist /app/frontend/dist

COPY backend/entrypoint.sh /app/backend/entrypoint.sh
RUN chmod +x /app/backend/entrypoint.sh

WORKDIR /app/backend
EXPOSE 4000

CMD ["/app/backend/entrypoint.sh"]
