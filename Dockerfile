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
