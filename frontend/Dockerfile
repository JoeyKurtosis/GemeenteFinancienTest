# --- Dev target (used by docker-compose for hot reload) ---
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
# Source is volume-mounted in docker-compose; this stage just has node_modules

# --- Build stage ---
FROM dev AS build
COPY . .
RUN npm run build

# --- Production stage ---
FROM nginx:1.27-alpine AS prod
# Copy built SPA
COPY --from=build /app/dist /usr/share/nginx/html
# Copy nginx config as a template (envsubst replaces $BACKEND_HOST at startup)
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
# nginx:alpine image auto-runs envsubst on /etc/nginx/templates/*.template
CMD ["nginx", "-g", "daemon off;"]
