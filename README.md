# Carbon Credit

Full-stack **carbon credit exchange** — not a static demo.

Farmers register reforestation land in Postgres, admins verify ownership and NDVI via API workflows, and businesses purchase audited offsets with persisted ledgers and certificates. Built as a **Next.js App Router** app with **Prisma + Supabase PostgreSQL**, **JWT sessions**, and **Nodemailer OTP**.

**Live:** [carbon-credit1.vercel.app](https://carbon-credit1.vercel.app/) · **Repo:** [Swastik45/CarbonCredit](https://github.com/Swastik45/CarbonCredit)

## Architecture

```
Browser (React UI)
    │
    ▼
Next.js API routes  ──JWT cookie──► Auth / sessions
    │
    ├── Prisma ORM ──► PostgreSQL (Supabase)
    ├── Nodemailer ──► OTP / password reset email
    └── Optional Redis ──► rate-limit / cache (LRU fallback)
```

| Layer | What it does |
|-------|----------------|
| **API** | REST handlers under `src/app/api/**` for auth, plantations, admin verify, purchases, certificates, stats |
| **Database** | Prisma models: `User`, `Plantation`, `CarbonPurchase`, `CarbonTransaction` on Supabase Postgres |
| **Auth** | Signup → email OTP → login; bcrypt passwords; signed httpOnly JWT cookies |
| **Business logic** | Role checks (farmer / admin / business), NDVI + credit issuance, purchase ledger |
| **UI** | Portal pages that call those APIs — screenshots below are the frontend *of* this stack |

## Backend capabilities

- **Auth API** — signup, login, logout, me, verify/resend OTP, forgot/reset password
- **Plantations API** — create/list plots with GPS, Lalpurja parcel ID, docs, species, area
- **Admin verify API** — approve/reject with NDVI score → issue `creditsIssued` into the DB
- **Business purchases API** — buy verified credits, write purchase + transaction rows
- **Certificates API** — generate/serve audit certificates for verified plots
- **Stats API** — platform aggregates for dashboards
- **Geo helpers** — reverse geocoding / location match audit for map markers

## Roles & data flow

| Role | Server-side workflow |
|------|----------------------|
| **Farmer** | `POST /api/plantations` → status `PENDING` → wait for admin → credits written on verify |
| **Admin** | `POST /api/admin/verify` → ownership + NDVI → `VERIFIED` / `REJECTED` + credit issuance |
| **Business** | `POST /api/business/purchases` → decrement available credits → ledger + receipt |

## Tech stack

| Layer | Tools |
|-------|--------|
| Runtime | Next.js 14 (App Router) — pages **and** API routes |
| Language | TypeScript, React 18 |
| Database | PostgreSQL (Supabase) + Prisma 5 |
| Auth | `jsonwebtoken`, `bcryptjs`, httpOnly cookies |
| Email | Nodemailer |
| Maps / 3D | Leaflet + Esri tiles, Three.js landing |
| Cache | Optional `ioredis` + in-memory LRU |
| Deploy | Vercel + Supabase |

## Project structure

```
src/app/api/          # Backend: auth, plantations, admin, business, certificates, stats
src/app/*/page.tsx    # Frontend routes that consume those APIs
src/lib/              # dbconnect, auth/session, email, redis, geoVerification
prisma/schema.prisma  # Source of truth for DB models & enums
```

## API reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/signup` | Create user + send OTP |
| POST | `/api/auth/verify-otp` | Confirm email |
| POST | `/api/auth/login` | Issue session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current user from JWT |
| POST | `/api/auth/forgot-password` / `reset-password` | Password recovery |
| GET/POST | `/api/plantations` | List / register plots |
| POST | `/api/admin/verify` | Approve or reject + NDVI / credits |
| GET/POST | `/api/business/purchases` | Marketplace purchases + history |
| GET | `/api/certificates/[id]` | Certificate for verified plot |
| GET | `/api/stats` | Platform statistics |

## Data model (Prisma)

- **User** — email, password hash, role, OTP/reset fields, `carbonCredits`
- **Plantation** — farmer FK, GPS, parcel ID, docs, `ndviScore`, `status` (`PENDING` \| `VERIFIED` \| `REJECTED`), `creditsIssued`
- **CarbonPurchase** — business ↔ plantation purchase record
- **CarbonTransaction** — ledger / certificate trail

## Getting started

### Prerequisites

- Node.js 18+
- Supabase Postgres (or any Postgres)
- SMTP optional (without it, OTPs log to the server console)

```bash
npm install
cp .env.example .env   # fill DATABASE_URL, DIRECT_URL, JWT_SECRET, etc.
npx prisma db push     # sync schema to Postgres
npm run dev            # http://localhost:3000
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled Postgres (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Session/direct Postgres (port 5432) for Prisma |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Supabase project (server-side) |
| `JWT_SECRET` | Signs session cookies |
| `SMTP_*` | OTP / reset email |

Optional: `ENABLE_REDIS=true`, `REDIS_URL`

> On Vercel: paste values **without** quotes. Use `SUPABASE_*` (not `NEXT_PUBLIC_*`) so env saves aren’t blocked.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local full stack (UI + API) |
| `npm run build` / `npm start` | Production |
| `npm run lint` | ESLint |

## Deploy

1. Connect this repo on Vercel (root = `.`)
2. Set env vars → redeploy Production
3. Point Supabase Auth URL config at your Vercel domain if needed

## Screenshots

Frontend for the APIs and database above — same portal design across auth, dashboard, map, and farmer tools.

| Landing | Login |
|:-------:|:-----:|
| ![Landing](docs/screenshots/01-landing.png) | ![Login](docs/screenshots/02-login.png) |
| 3D forest field guide | JWT + OTP sign-in |

| Dashboard | NDVI guide |
|:---------:|:----------:|
| ![Dashboard](docs/screenshots/03-dashboard.png) | ![NDVI](docs/screenshots/04-ndvi-guide.png) |
| Role portal + live DB metrics | Formula + sequestration simulator |

| Satellite map | Farmer portal |
|:-------------:|:-------------:|
| ![Map](docs/screenshots/05-satellite-map.png) | ![Farmer](docs/screenshots/06-farmer-portal.png) |
| Leaflet + Esri reverse-geocode audit | Plot registration → `POST /api/plantations` |

## Notes

- SMTP unset → OTPs print in the server terminal
- Redis off by default → LRU rate-limit fallback
- Admin allowlist: `src/lib/adminBypass.ts`

## License

Private (`"private": true` in `package.json`).
