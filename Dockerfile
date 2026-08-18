# syntax=docker/dockerfile:1.7
#
# Production image for the TanStack Start app (Nitro node-server preset).
# Build: DOCKER_BUILDKIT=1 docker build --build-arg VITE_BASE_URL=https://your.domain -t tanplate-app .
# Run:   node .output/server/index.mjs  (handled by docker-entrypoint.sh)

############################
# base — pnpm via corepack
############################
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

############################
# deps — full install (build)
############################
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

############################
# build — produce .output
############################
FROM deps AS build
# VITE_ vars are inlined into the client bundle at build time, so they must be
# present during `pnpm build` (not just at runtime).
ARG VITE_BASE_URL
ENV VITE_BASE_URL=${VITE_BASE_URL}
COPY . .
RUN pnpm build

############################
# tools — minimal drizzle-kit for migrations
############################
FROM base AS tools
WORKDIR /tools
# `drizzle-kit migrate` only needs the migrations folder + config + dotenv;
# it does not load the TS schema, so we avoid shipping the full dev toolchain.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm add drizzle-kit@0.31.9 drizzle-orm@0.45.1 pg@8.16.3 dotenv@17.3.1

############################
# runner — lean runtime image
############################
FROM node:22-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# dumb-init for proper PID 1 / signal handling
RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Non-root runtime user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs appuser

# Self-contained server bundle (Nitro node-server preset)
COPY --from=build --chown=appuser:nodejs /app/.output ./.output

# Static assets that are read from disk at runtime rather than served over HTTP
# (anything loaded via `readFile(process.cwd()/public/...)`) — the server bundle
# alone would not include them.
COPY --from=build --chown=appuser:nodejs /app/public ./public

# Migration tooling + files
COPY --from=tools --chown=appuser:nodejs /tools/node_modules ./node_modules
COPY --chown=appuser:nodejs drizzle.config.ts ./drizzle.config.ts
COPY --chown=appuser:nodejs src/lib/db/drizzle ./src/lib/db/drizzle
# Admin bootstrap, run by the entrypoint after migrations. Needs only `pg` (above)
# plus Node builtins — no TypeScript toolchain in this stage.
COPY --chown=appuser:nodejs scripts ./scripts
COPY --chown=appuser:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(()=>process.exit(0)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
