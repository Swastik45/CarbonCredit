# 🌱 Carbon Credit Marketplace
### A full-stack carbon credit marketplace built with Next.js, role-based dashboards, and email verification.

This repository contains a modern marketplace prototype in `nextjs-app/`, connecting farmers, businesses, and admins with NDVI-based plantation verification and an interactive Leaflet map.

---

## 🚀 Quick Start

```bash
cd nextjs-app
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ✨ What’s Included

- **Next.js 14** with App Router
- **Tailwind CSS** for styling
- **Leaflet** interactive plantation map
- **Role-based dashboards** for farmer, business, and admin users
- **Supabase Auth-compatible email verification flow**
- **Email rate limit handling** with user-friendly responses
- **Development email bypass** for local testing
- **API routes** for plantations, purchases, verification, and stats
- **NDVI guide** and credit calculation support

---

## 🧭 Main Features

- **Farmer dashboard**: register plantations, track status, view earnings, and map locations
- **Business dashboard**: browse verified plantations, purchase credits, and review transaction history
- **Admin panel**: verify and reject plantation submissions
- **Interactive map**: marker popups, status color coding, auto-fit bounds, and hover feedback
- **Email verification**: confirmation flow with resend support
- **Rate limit handling**: detects Supabase email rate limits and returns clear guidance
- **Dev bypass**: skip email confirmation during local development

---

## 📁 Repository Structure

```text
CarbonCredit/
├── nextjs-app/                # Main Next.js application
│   ├── app/                   # Pages, API routes, dashboards
│   ├── components/            # Shared UI components
│   ├── lib/                   # Database/auth helpers
│   ├── public/                # Static assets
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md                  # Project overview
```

---

## 🔧 Setup

### Environment
Create a `.env.local` in `nextjs-app/` if needed.

Example variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
```

### Run locally

```bash
cd nextjs-app
pnpm install
pnpm dev
```

### Production

```bash
cd nextjs-app
pnpm build
pnpm start
```

---

## 📌 Notes on Email and Supabase

- The app currently uses Supabase Auth for signup and email confirmation.
- If you hit email rate limits, configure SMTP in Supabase or use a dedicated email provider like SendGrid or Mailgun.
- For local development, a `skipEmail` bypass is available to avoid repeated confirmation emails.

---

## 📚 Documentation

For more detailed app-specific docs, review `nextjs-app/README.md`.

---

## 💡 Recommended Commands

```bash
cd nextjs-app
pnpm install
pnpm dev
pnpm build
pnpm start
```

---

## License

MIT


