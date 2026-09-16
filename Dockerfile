FROM node:22 AS build

# Vite bakes VITE_* vars into the JS bundle at build time, not runtime.
# Defaults to a relative path, proxied to nccrd-api by nginx.conf's /api/
# location block — the browser only ever talks to this one origin, so this
# same image works unmodified on any server, with no per-deployment rebuild
# and no CORS involved. Only override this if you're serving the frontend
# from somewhere that ISN'T proxying /api/ itself (e.g. a raw `vite dev`
# session with no nginx in front).
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# wget (BusyBox) ships on nginx:alpine by default; curl doesn't. This is a
# static file server with no backend logic of its own, so checking "/"
# (always index.html, always 200 if nginx is actually serving) is enough —
# there's no separate app process to distinguish from the web server here.
# Use 127.0.0.1, not localhost: this image's nginx.conf only listens on
# 0.0.0.0:80 (IPv4), but musl/BusyBox wget resolves "localhost" to ::1
# first, so it would always get connection-refused over IPv6 and never
# fall back to the working IPv4 address.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
