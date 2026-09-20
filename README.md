# Carbon Credit

A nature-based carbon credit marketplace. Farmers register reforestation plots with land title and GPS data, admins verify ownership and satellite health (NDVI), and businesses purchase verified offsets with certificates.

## Features

- **Farmers** — register plantation plots (parcel ID, coordinates, species, land docs)
- **Admins** — audit land ownership, set NDVI scores, approve or reject submissions, issue credits
- **Businesses** — browse verified listings, purchase offsets, view transaction ledger and certificates
- **Maps** — Leaflet satellite map of plantation footprints
- **Auth** — email OTP signup/login, JWT sessions, password reset
- **Landing** — immersive 3D forest experience (Three.js)

## Tech stack

| Layer | Tools |
|-------|--------|
| App | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Database | PostgreSQL via Supabase + Prisma |
| Auth | JWT (`jsonwebtoken`), bcrypt, httpOnly cookies |
| Email | Nodemailer (OTP / password reset) |
| Maps / 3D | Leaflet, Three.js |
| Cache | Optional Redis (`ioredis`) with in-memory LRU fallback |

## Project structure

```
src/
  app/           # Pages + API routes
  components/    # Maps, modals, forest scene, shared UI
  lib/           # Auth, DB, Redis, email helpers
prisma/          # Schema and migrations
public/          # Static assets (forest imagery, etc.)
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing |
| `/login`, `/signup` | Authentication |
| `/dashboard` | Role-based portal (admin / farmer / business) |
| `/farmer` | Plantation registration workbench |
| `/map` | Full-screen satellite map |
| `/ndvi-guide` | NDVI education / calculator |

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase (or other PostgreSQL) project
- SMTP credentials (optional — OTPs print to the server console if unset)

### 1. Install

```bash
npm install
```

`postinstall` runs `prisma generate` automatically.

### 2. Environment

```bash
cp .env.example .env
```

Fill in:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled Postgres URL (app queries) |
| `DIRECT_URL` | Direct Postgres URL (Prisma migrate / push) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `JWT_SECRET` | Secret for signed session cookies |
| `SMTP_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password / app password |
| `SMTP_FROM` | From address for outbound mail |

Optional:

| Variable | Purpose |
|----------|---------|
| `ENABLE_REDIS` | Set `true` to use Redis |
| `REDIS_URL` | Redis connection string (default `redis://localhost:6379`) |

### 3. Database

```bash
npx prisma db push
```

Or use migrations against your Supabase project if you prefer a migration history.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |

## Roles

| Role | Capabilities |
|------|----------------|
| `FARMER` / `USER` | Submit plots, track verification, earn credits |
| `ADMIN` | Verify ownership, set NDVI, issue or reject credits |
| `BUSINESS` / `COMPANY` | Buy verified credits, view ledger & certificates |

Admin access can also be granted via the allowlist in `src/lib/adminBypass.ts`.

## API overview

- **Auth** — `/api/auth/signup`, `login`, `logout`, `me`, `verify-otp`, `resend-otp`, `forgot-password`, `reset-password`
- **Plantations** — `/api/plantations`
- **Admin** — `/api/admin/verify`
- **Business** — `/api/business/purchases`
- **Other** — `/api/stats`, `/api/certificates/[id]`

## Data model (Prisma)

- **User** — identity, role, OTP/reset hashes, credit balance
- **Plantation** — plot metadata, GPS, parcel ID, docs, NDVI, status, credits issued
- **CarbonPurchase** — business purchases against plantations
- **CarbonTransaction** — ledger / certificate trail

## Notes

- Without SMTP configured, verification OTPs are logged in the terminal.
- Redis is off by default; rate limiting falls back to an in-memory LRU cache.
- Reverse geocoding uses OpenStreetMap Nominatim where needed.

## License

Private project (`"private": true` in `package.json`).
