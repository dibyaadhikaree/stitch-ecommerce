# STITCH Studio Web

Standalone Next.js admin frontend for STITCH Studio.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Environment

Create `apps/web/.env.local` and point the frontend at the API:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## Deploy

This app is configured to deploy from `apps/web` directly on Vercel.
