# Multi-stage production build for Gym Management React Frontend on Coolify

# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application source
COPY . .

# Inject API base URL at build time (defaults to /api/ for reverse proxy or relative setups)
ARG VITE_API_BASE_URL=http://localhost:8001/api/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build optimized production bundle
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

# Custom Nginx config with SPA fallback routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to Nginx docroot
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
