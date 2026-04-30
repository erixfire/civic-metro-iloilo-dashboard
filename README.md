# Civic Metro Iloilo Dashboard

[![Deploy to Cloudflare Pages](https://github.com/erixfire/civic-metro-iloilo-dashboard/actions/workflows/deploy.yml/badge.svg)](https://github.com/erixfire/civic-metro-iloilo-dashboard/actions/workflows/deploy.yml)

An integrated real-time city services web app for Metro Iloilo — covering traffic management, weather, heat index, fuel prices, utility alerts, incident reporting, CSWDO services, community kitchen (admin), and more.

---

## Features

- 🌡️ **Weather & Heat Index** — Live PAGASA data, heat index alerts in Hiligaynon
- 🚦 **Traffic** — Road status, incident map, jeepney reroutes
- ⚡ **Utility Alerts** — MORE Power, MCWD outages and advisories
- ⛽ **Fuel Watch** — Weekly DOE/LPCC fuel price tracker
- 🌊 **Tide & Rain** — PAGASA tide tables, CDRRMO rain gauge stations
- 🏛️ **CSWDO Services** — Social welfare services directory
- 📰 **News** — Auto-scraped feeds from MORE Power, CDRRMO, CITOM, MCWD, Iloilo City Gov
- 📌 **Incident Reporting** — Public incident submission form
- 🔐 **Admin Panel** — Secure admin dashboard (Cloudflare Access + JWT)
- 📱 **PWA** — Installable on Android/iOS with offline support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Maps | Leaflet + react-leaflet |
| Charts | Chart.js + react-chartjs-2 |
| State | Zustand |
| Backend | Cloudflare Workers (Pages Functions) |
| Database | Cloudflare D1 (SQLite) |
| PWA | vite-plugin-pwa + Workbox |
| Deployment | Cloudflare Pages |

---

## Prerequisites

- **Node.js** v20 or later
- **npm** v10 or later
- **Wrangler CLI** v3: `npm install -g wrangler`
- A **Cloudflare account** with Pages and D1 enabled

---

## Local Development

```bash
# 1. Clone the repository
git clone https://github.com/erixfire/civic-metro-iloilo-dashboard.git
cd civic-metro-iloilo-dashboard

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Fill in the values in .env.local

# 4. Start dev server (frontend only)
npm run dev

# 5. Or start with Cloudflare Workers (full-stack, recommended)
npx wrangler pages dev dist --local
```

The app runs at **http://localhost:5173** (Vite) or **http://localhost:8788** (Wrangler Pages).

---

## Environment Variables

Create a `.env.local` file based on `.env.example`:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | ✅ Yes | Long random string for JWT signing (admin auth) |
| `VITE_VAPID_PUBLIC_KEY` | Optional | VAPID public key for push notifications |
| `VAPID_PRIVATE_KEY` | Optional | VAPID private key (server-side only) |
| `VAPID_SUBJECT` | Optional | `mailto:it@iloilocity.gov.ph` |

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

For **production**, set these in:
> Cloudflare Dashboard → Workers & Pages → civic-metro-iloilo-dashboard → Settings → Environment Variables

---

## Cloudflare D1 Database Setup

```bash
# Create the D1 database (first time only)
npx wrangler d1 create civic-iloilo-db

# Apply migrations
npx wrangler d1 execute civic-iloilo-db --file=db/schema.sql
```

The `database_id` in `wrangler.toml` must match your created database.

---

## Deployment

### Automatic (CI/CD)
Every push to `main` auto-deploys via GitHub Actions.

Required GitHub Secrets:
- `CLOUDFLARE_API_TOKEN` — [Create token](https://dash.cloudflare.com/profile/api-tokens) with `Cloudflare Pages: Edit` permission
- `CLOUDFLARE_ACCOUNT_ID` — Found in Cloudflare Dashboard → right sidebar

### Manual
```bash
npm run build
npx wrangler pages deploy dist --project-name=civic-metro-iloilo-dashboard
```

---

## Architecture Overview

```
src/
├── components/      # All UI components (cards, maps, admin panels)
├── data/            # Static config and mock data
├── hooks/           # Custom React hooks (data fetching)
├── store/           # Zustand state stores
└── utils/           # Shared utility functions

functions/
└── api/             # Cloudflare Workers API endpoints
    ├── fuel-watch/  # Fuel price sync & API
    ├── incidents/   # Incident CRUD
    ├── scrape/      # Unified news scraper
    └── ...          # Auth, notifications, utility alerts

db/
└── schema.sql       # D1 database schema

docs/
└── cloudflare-access-setup.md  # Admin access guide
```

---

## Scraper Cron (Fuel Prices)

The fuel sync worker runs every Tuesday at 08:00 PHT. Deploy it separately:

```bash
npx wrangler deploy functions/api/fuel-prices/sync.js --name civic-fuel-cron
```

Then add cron in Cloudflare Dashboard:
> Workers & Pages → civic-fuel-cron → Triggers → Add Cron: `0 0 * * 2`

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

Maintained by **Iloilo City Government** — IT Department.
