# nccrd-react-ui

React + Vite frontend for the National Climate Change Response Database (NCCRD), built for South
Africa's Department of Forestry, Fisheries and the Environment.

Talks to [nccrd-server](https://github.com/SAEON/nccrd-server) — a FastAPI backend with its own
local JWT auth and fully DB-backed RBAC (roles/permissions/tenants). In production, nginx serves
the built static assets and reverse-proxies `/api/` to the backend on the same origin (see
`nginx.conf`), so the app never needs a separate API URL at build time.

## Local development

```bash
npm install
cp .env.example .env.local   # points VITE_API_URL at a locally running nccrd-server
npm run dev
```

## Scripts

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the production build locally.
- `npm run lint` — ESLint.

## Deployment

Built and served via a multi-stage Docker image (`Dockerfile`) — see the sibling
[nccrd-build](https://github.com/SAEON/nccrd-build) repo's `deploy/` directory for the
docker-compose setup, GHCR image publishing, and server deployment.
