# Stage 1: Build
FROM node:20-alpine AS builder

ARG APP_VERSION=dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV VITE_APP_VERSION=$APP_VERSION
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
