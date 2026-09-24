FROM node:18-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN echo "--- DEBUG: dotfiles in /app ---" && find /app -maxdepth 1 -name ".*" && \
    echo "--- DEBUG: /app/.env content ---" && (cat /app/.env || echo ".env NOT FOUND")
RUN npm run build
RUN echo "--- DEBUG: API URL baked into build ---" && (grep -o "deux-pas-un-monde\.onrender\.com\|api\.deuxpasunmonde\.fr" build/static/js/*.js | sort -u || echo "no match found")

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
