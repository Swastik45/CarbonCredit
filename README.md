# Carbon Credit (Nepal-first MRV)

Full-stack **voluntary carbon credit exchange** with real plot capture and Sentinel-2 NDVI measurement.

Farmers draw GPS boundaries in Nepal, the API measures mean NDVI via **Microsoft Planetary Computer** (free Sentinel-2 L2A — no API key / card), admins approve from stored observations (not sliders), and businesses buy offsets with certificates that show scene date, NDVI, and cloud fraction.

**Live:** [carbon-credit1.vercel.app](https://carbon-credit1.vercel.app/) · **Repo:** [Swastik45/CarbonCredit](https://github.com/Swastik45/CarbonCredit)

> Credits are a **platform voluntary estimate** (`area × NDVI × species × 12.5`). Not Verra / Gold Standard compliance credits.

## Architecture

```
Browser (GPS + Leaflet draw)
    │
    ▼
Next.js API routes  ──JWT cookie──► Auth / sessions
    │
    ├── Prisma ORM ──► PostgreSQL (Supabase)
    ├── Planetary Computer ──► free Sentinel-2 mean NDVI over polygon
    ├── Nodemailer ──► OTP / password reset email
    └── Optional Redis ──► rate-limit / cache (LRU fallback)
```

## MRV flow (Nepal)

1. Farmer: **Use my location** + **draw polygon** + Lalpurja parcel ID → `POST /api/plantations`
2. Server: Nepal bounds, area match (±25%), optional auto `measureAndStoreNdvi`
3. Admin: **Re-measure NDVI** → `POST /api/ndvi/measure` → Approve (uses stored observation only)
4. Business: purchase → certificate shows measured NDVI metadata

## Backend capabilities

- **Auth API** — signup, login, logout, me, verify/resend OTP, forgot/reset password
- **Plantations API** — require `boundaryGeoJson`, measured hectares, Nepal bounds, Lalpurja uniqueness
- **NDVI measure API** — Microsoft Planetary Computer (free) → `NdviObservation` rows
- **Admin verify API** — approve/reject from measured NDVI (gates: NDVI ≥ 0.3, cloud ≤ 40%)
- **Business purchases API** — buy verified credits, ledger + receipt
- **Certificates API** — scene date, mean NDVI, cloud %, satellite id
- **Geo helpers** — geodesic area, Nepal bounds, Nominatim reverse-geocode audit

## Roles & data flow

| Role | Workflow |
|------|----------|
| **Farmer** | Draw Nepal plot → `PENDING` → wait for admin |
| **Admin** | Measure NDVI → approve → credits from measured NDVI |
| **Business** | Buy verified credits → certificate |

## Tech stack

| Layer | Tools |
|-------|--------|
| Runtime | Next.js 14 (App Router) |
| Language | TypeScript, React 18 |
| Database | PostgreSQL (Supabase) + Prisma 5 |
| Auth | `jsonwebtoken`, `bcryptjs`, httpOnly cookies |
| Satellite | Microsoft Planetary Computer (free Sentinel-2 L2A NDVI) |
| Maps | Leaflet + Esri imagery + Leaflet.draw (CDN) |
| Email | Nodemailer |
| Deploy | Vercel + Supabase |

## Project structure

```
src/app/api/          # auth, plantations, ndvi/measure, admin, business, certificates, stats
src/lib/              # geoArea, sentinelHub, ndviMeasure, geoVerification, antiScam, session
src/components/       # PlotBoundaryDrawer, LeafletMapClient, …
prisma/schema.prisma  # User, Plantation, NdviObservation, purchases, transactions
```

## API reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/signup` | Create user + send OTP |
| POST | `/api/auth/verify-otp` | Confirm email |
| POST | `/api/auth/login` | Issue session cookie |
| GET/POST | `/api/plantations` | List / register plots (polygon required) |
| GET/POST | `/api/ndvi/measure` | List observations / run Sentinel-2 measure |
| POST | `/api/admin/verify` | Approve or reject (measured NDVI only) |
| GET/POST | `/api/business/purchases` | Marketplace purchases + history |
| GET | `/api/certificates/[id]` | Certificate with NDVI metadata |
| GET | `/api/stats` | Platform statistics |

## Data model (Prisma)

- **User** — email, role, OTP/reset, `carbonCredits`
- **Plantation** — GPS, `boundaryGeoJson`, `areaHectares` (claimed), `measuredAreaHectares`, `ndviScore` (latest), status, credits
- **NdviObservation** — mean NDVI, cloud %, scene date, satellite, raw stats JSON
- **CarbonPurchase** / **CarbonTransaction** — marketplace ledger

## Getting started

### Prerequisites

- Node.js 18+
- Supabase Postgres (or any Postgres)
- SMTP optional (without it, OTPs log to the server console)
- NDVI uses **free Microsoft Planetary Computer** (no API key)

```bash
npm install
cp .env.example .env   # fill DATABASE_URL, DIRECT_URL, JWT_SECRET
npx prisma db push     # sync schema to Postgres
npm run dev            # http://localhost:3000
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled Postgres |
| `DIRECT_URL` | Direct Postgres for Prisma |
| `JWT_SECRET` | Session cookies |
| `SMTP_*` | OTP / reset email |

Optional: `ENABLE_REDIS=true`, `REDIS_URL`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local full stack |
| `npm run build` / `npm start` | Production |
| `npm run lint` | ESLint |

## Deploy

1. Connect repo on Vercel
2. Set env vars → redeploy Production
3. Point Supabase Auth URL config at your Vercel domain if needed

## Notes

- NDVI needs no API keys (Planetary Computer)
- SMTP unset → OTPs print in the server terminal
- Redis off by default → LRU rate-limit fallback
- Admin allowlist: `src/lib/adminBypass.ts`

## License

Private (`"private": true` in `package.json`).
