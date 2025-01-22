FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build for production by default (override with --build-arg)
ARG ENV=production
RUN npm run build -- --configuration=${ENV}

FROM nginx:1.21-alpine

# Remove default Nginx configs
RUN rm -rf /etc/nginx/conf.d/*

# Copy all Nginx configs (both production and staging)
COPY nginx/*.conf /etc/nginx/conf.d/

# Copy built files
COPY --from=build /app/dist/doodle /usr/share/nginx/html

# Expose both HTTP and HTTPS ports
EXPOSE 80 443

# Use environment-specific config at runtime
CMD ["sh", "-c", "rm -f /etc/nginx/conf.d/*.conf && cp /etc/nginx/conf.d/${NGINX_ENV}.conf /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
