# Civic Metro Iloilo Dashboard — D1 Database

## Quick Start

### 1. Create the D1 database
```bash
npx wrangler d1 create civic-iloilo-db
```
Copy the `database_id` output and paste it into `wrangler.toml`.

### 2. Apply schema
```bash
npx wrangler d1 execute civic-iloilo-db --file=db/schema.sql
```

### 3. Seed with initial data
```bash
npx wrangler d1 execute civic-iloilo-db --file=db/seed.sql
```

### 4. Deploy to Cloudflare Pages
```bash
npx wrangler pages deploy dist --project-name=civic-metro-iloilo-dashboard
```

---

## Tables

| Table | Purpose | Rows today |
|---|---|---|
| `kitchen_sites` | Kitchen station registry | 6 |
| `kitchen_programs` | Feeding program periods | 1 |
| `kitchen_feeding_log` | Daily aggregate totals | 14 |
| `kitchen_site_log` | Per-site per-day breakdown | 6 |
| `incidents` | CDRRMO incident reports | — |
| `utility_alerts` | MORE Power / MIWD notices | 3 |
| `fuel_prices` | LPCC/DOE price log | 1 |
| `heat_index_log` | PAGASA daily HI readings | 11 |
| `app_settings` | Operator key-value config | 5 |

---

## API Endpoints (Cloudflare Pages Functions)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/kitchen-feeding` | Last 14 days log + today breakdown + totals |
| POST | `/api/kitchen-feeding` | Add daily log entry |
| GET | `/api/kitchen-feeding/sites` | List active kitchen sites |
| GET | `/api/incidents` | List incidents (filter by status/district/type) |
| POST | `/api/incidents` | Submit new incident |
| PATCH | `/api/incidents` | Resolve or delete incident |
| GET | `/api/fuel-prices` | Latest Iloilo fuel prices |
| POST | `/api/fuel-prices` | Log new fuel price entry |
| GET | `/api/fuel-watch` | National fuel benchmark (existing) |
| GET | `/api/rain-gauge` | Rain gauge data (existing) |
| GET | `/api/tide` | Tide data (existing) |
| GET | `/api/heat-index-news` | Heat index news (existing) |

---

## Migrations

Future schema changes go in `db/migrations/` as numbered SQL files:
```
db/migrations/
  0001_initial.sql      ← current baseline
  0002_add_column.sql   ← future changes
```

Apply with:
```bash
npx wrangler d1 migrations apply civic-iloilo-db
```

---

## D1 Binding

All `functions/api/*.js` files access the database via:
```js
const { results } = await env.DB.prepare('SELECT ...').all()
```
The binding name `DB` is set in `wrangler.toml`.
