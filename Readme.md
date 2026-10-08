# Fanclub Ticketing Demo

This monorepo-style demo simulates the full concert-ticket journey: a fan verifies their fan-club membership, checks live seat inventory, locks seats, pays, and receives a rotating mobile ticket barcode. It has three parts:

| Directory | Role | Default port |
|---|---|---|
| `fanclub-demo/` | Mock upstream services: a ticket-vendor API, a membership API, and a SQLite database that backs both; API console | Vendor `3001`, Membership `3002`, Console `3004` |
| `fanclub-ticketing-bridge/` | Express API gateway that the frontend talks to. It validates requests, applies business rules, and calls the two mocks | `3003` |
| `frontend/` | Vite + React web app that mimics the Weverse notice → tour dates → seat selection → checkout → ticket flow | `3000` |

## Directory layout

The three directories must sit side by side. `fanclub-demo/src/bridgeContracts.ts` imports types from `../../fanclub-ticketing-bridge/src/types/`, so moving one breaks the other.

```
<workspace>/
├── fanclub-demo/
├── fanclub-ticketing-bridge/
└── frontend/
```

---

## How the three connect

```
 Browser (frontend, Vite :3000)
    │  fetch('/bridge/...')
    ▼
 Vite dev proxy ── rewrites /bridge → '' ──▶ Bridge (Express :3003)
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         ▼                                               ▼
        Ticket vendor mock (:3001, /v1)                  Membership mock (:3002, /api)
                         │                                               │
                         └──────────── both read/write ──────────────────┘
                                      fanclub-demo/data/demo.db
```

- **Frontend → Bridge.** The frontend never calls the mocks directly. Its Vite dev server proxies every `/bridge/*` request to the bridge (`BRIDGE_URL`, default `http://localhost:3003`). Because requests are same-origin, no CORS setup is needed.
- **Bridge → mocks.** The bridge calls the ticket vendor (`TICKET_VENDOR_BASE_URL`) and the membership API (`MEMBERSHIP_BASE_URL`), using the API keys in its `.env`.
- **Mocks → database.** `fanclub-demo` runs both mock APIs against one SQLite file (`data/demo.db`). The membership tables and the vendor tables live in the same file.
- **Tests.** `fanclub-demo/src/e2e.ts` exercises the bridge end to end and expects it to be running.

---

## Run order

Start the services in this order. The first two must be running before the frontend can do anything useful.

1. **`fanclub-demo`**: the mock upstreams (first run needs a reset to seed the database)
2. **`fanclub-ticketing-bridge`**: the API gateway
3. **`frontend`**: the web app

> The package.json scripts below are the ones the projects use (for example `start:fresh` is referenced in the e2e script's error message). If a script name differs in your `package.json`, use the matching one.

### 1. `fanclub-demo` (mocks)

```bash
cd fanclub-demo
pnpm install            # or npm install

# First run, or whenever you want a clean database:
npm run start:fresh     # equivalent to: npx tsx src/server.ts --reset

# Later runs (keeps existing data):
npm run start           # equivalent to: npx tsx src/server.ts
```

On startup you should see:

```
Mock Ticket Vendor Partner API -> http://localhost:3001/v1
Mock Membership API            -> http://localhost:3002/api
```

Stop with `Ctrl+C`. The server closes both servers and the database cleanly.

### 2. `fanclub-ticketing-bridge` (API gateway)

```bash
cd fanclub-ticketing-bridge
pnpm install
npm run dev             # or: npm start, after a build; check your package.json
```

On startup:

```
fanclub-ticketing-bridge listening on :3003 (development)
    ticket vendor -> http://localhost:3001/v1
    membership    -> http://localhost:3002/api
```

Check it with:

```bash
curl http://localhost:3003/health
```

### 3. `frontend` (web app)

```bash
cd frontend
pnpm install
pnpm dev
```

Open the URL Vite prints, with the hash route for the first page, for example `http://localhost:<port>/#/2a`.

Only `pnpm dev` and `vite preview` run the `/bridge` proxy. A static build (`pnpm build`) needs its own reverse proxy for `/bridge`, or CORS enabled on the bridge.

### Verify the whole stack

With all three running:

```bash
cd fanclub-demo
npx tsx src/e2e.ts
```

The script runs the happy path (availability → verify → lock → billing → commit → mobile ticket → barcode check) and a set of guardrail checks. It prints `N passed, M failed` and exits non-zero on failure.

---

## 1. `fanclub-demo/`: mock upstream services

### Purpose

Stands in for the real ticket vendor and fan-club membership systems. It supplies realistic data and behaviour so the bridge and frontend can be built and tested without real partners.

### Structure

```
fanclub-demo/
├── package.json
├── .env
├── data/
│   └── demo.db                 # SQLite database (created on first run)
└── src/
    ├── server.ts               # Starts both mock APIs
    ├── config.ts               # Ports, API keys, DB path, latency
    ├── bridgeContracts.ts     # Re-exports the bridge's wire types
    ├── e2e.ts                  # End-to-end test against the bridge
    ├── db/
    │   ├── connection.ts       # Opens SQLite (WAL, foreign keys on), applies schema
    │   ├── schema.sql          # Tables for membership, vendor, carts, orders, tickets
    │   ├── seed.ts             # Members, tiers, events, seats, sample orders
    │   └── tourSeed.ts         # Tour venues → one vendor event per venue, with seats
    └── mocks/
        ├── common.ts           # HttpError, money helpers, request logger, error handler
        ├── membershipApi.ts    # Fan-club membership API (Express app factory)
        └── ticketVendorApi.ts  # Ticket vendor partner API (Express app factory)
```

### Mock ticket vendor API (`:3001`, base path `/v1`)

Requires `x-api-key` and `x-partner-id` headers.

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/events/:eventId/availability` | Seat map, sections, price levels, totals |
| POST | `/v1/carts` | Create a cart and hold seats for `holdDurationSeconds` (requires `X-Membership-Id`) |
| PUT | `/v1/carts/:cartId/billing` | Attach a billing profile and a tokenised payment |
| PUT | `/v1/carts/:cartId/commit` | Convert holds to sold seats and create an order and tickets (requires `Idempotency-Key`) |
| GET | `/v1/tickets/:ticketId` | Ticket and barcode (`ROTATING` or `STATIC`) (requires `X-Membership-Id`) |

Behaviours worth knowing:

- **Holds expire.** Expired carts are cleaned up lazily, and their seats return to inventory.
- **Idempotent commits.** Replaying the same `Idempotency-Key` returns the original order.
- **Simulated declines.** A payment token starting with `tok_decline` returns a `FAILED` order.
- **Rotating barcodes.** `src/services/rotatingBarcode.ts` (bridge side) derives the barcode from a per-ticket secret. The vendor stores only the secret.

### Mock membership API (`:3002`, base path `/api`)

Requires `Authorization: Bearer <MEMBERSHIP_API_KEY>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/members/verify` | Look up a member by email. Always `200`; returns `{ found: true, member }` or `{ found: false }` |
| GET | `/api/members/:membershipId` | Look up a member by ID (`404 MEMBER_NOT_FOUND` if absent) |

Each membership tier has a `maxTicketsPerOrder` and a `presaleAccess` flag. The bridge uses both.

### Seeded data

| Account (email) | Membership status | Tier | Presale access | Max seats per order |
|---|---|---|---|---|
| `fan@example.com` | ACTIVE | Gold | Yes | 8 |
| `platinum@example.com` | ACTIVE | Platinum | Yes | 10 |
| `silver@example.com` | ACTIVE | Silver | No | 4 |
| `basic@example.com` | ACTIVE | Basic | No (null) | 8 (default) |
| `expired@example.com` | EXPIRED | Gold | Yes | — |
| `suspended@example.com` | SUSPENDED | Silver | — | — |
| `pending@example.com` | PENDING | Basic | — | — |

Tour venues (`new-york`, `los-angeles`, `boston`, `chicago`, `arlington`, `toronto`, `baltimore`, `las-vegas`) each have a vendor event with the same ID. Each event has three sections: Floor A1 ($400 face + $50 fees), 102 Lower Bowl ($200 + $20), and 204 Club ($135 + $15). The legacy `evt_123`, `evt_456` and `evt_999` events are also seeded for the e2e tests.

### Configuration (`.env`)

```env
VENDOR_PORT=3001
MEMBERSHIP_PORT=3002
VENDOR_API_KEY=demo-vendor-key
VENDOR_PARTNER_ID=fanclub-partner-001
MEMBERSHIP_API_KEY=demo-membership-key
DB_PATH=./data/demo.db
MOCK_LATENCY_MS=0            # add artificial latency to each response
```

The bridge's `.env` must use the same keys and partner ID.

### Resetting data

```bash
npm run start:fresh          # drops and re-seeds every table
```

Seats sold during testing stay sold until you reset.

---

## 2. `fanclub-ticketing-bridge/`: API gateway

### Purpose

The single API the frontend talks to. It verifies fan membership, checks inventory, locks seats, attaches billing, commits orders, and returns mobile tickets. It also enforces the business rules (presale access, seat limits, membership status), normalises upstream errors into one format, and keeps a short membership cache.

### Structure

```
fanclub-ticketing-bridge/
├── package.json
├── .env
└── src/
    ├── server.ts               # Starts the HTTP server, handles SIGINT/SIGTERM
    ├── app.ts                  # Builds the Express app, mounts the routers
    ├── config.ts               # Validates environment variables with zod
    ├── errors.ts               # AppError, UpstreamError and helpers
    ├── clients/
    │   ├── httpClient.ts       # fetch wrapper: timeouts, error mapping
    │   ├── membershipClient.ts # Calls the membership API
    │   └── ticketVendorClient.ts # Calls the ticket vendor API
    ├── middleware/
    │   ├── errorHandler.ts     # Converts errors to JSON; 404 catch-all
    │   ├── requestLogger.ts    # X-Request-Id and one log line per request
    │   ├── requireMembership.ts # Requires and re-verifies X-Membership-Id
    │   └── validate.ts         # zod validation for body/params
    ├── routes/
    │   ├── events.ts           # GET  /events/:eventId/availability
    │   ├── membership.ts       # POST /membership/verify
    │   ├── carts.ts            # POST /carts/lock, PUT billing, PUT commit
    │   └── tickets.ts          # GET  /tickets/:ticketId
    ├── services/
    │   ├── availabilityService.ts # Maps vendor inventory to the bridge's response
    │   ├── membershipService.ts   # Verification, tier rules, TTL cache
    │   ├── cartService.ts         # Lock, billing, commit, with rules
    │   ├── rotatingBarcode.ts     # HMAC-based rotating barcode generation
    │   └── ticketService.ts       # Mobile ticket with current barcode
    └── types/
        ├── api.ts              # Request and response shapes used by the frontend
        ├── membership.ts       # Membership records and verification responses
        └── vendor.ts           # Wire types from the ticket vendor
```

### Endpoints

| # | Method | Path | Headers | Purpose |
|---|---|---|---|---|
| — | GET | `/health` | — | Liveness check |
| 1 | GET | `/events/:eventId/availability` | — | Seats, sections, price ranges and totals for an event |
| 2 | POST | `/membership/verify` | — | Body `{ email }`. Returns membership ID, tier, status and `eligibleToPurchase` |
| 3 | POST | `/carts/lock` | `X-Membership-Id` | Body `{ eventId, seatIds[] }`. Holds seats and returns a cart with totals and hold expiry |
| 4 | PUT | `/carts/:cartId/billing` | `X-Membership-Id` (only via frontend) | Body is the billing profile with a `tok_` payment token |
| 5 | PUT | `/carts/:cartId/commit` | `Idempotency-Key` | Confirms the order and issues tickets |
| 6 | GET | `/tickets/:ticketId` | `X-Membership-Id` | Ticket details and the current barcode (rotating or static) |

### Business rules

- **Membership verification.** An email that doesn't exist returns `404 { verified: false }`. An expired, suspended or pending membership returns `200` with `eligibleToPurchase: false` and a `reason`.
- **Presale gate.** Locking seats requires a tier with presale access. This check runs after the seat-limit check. Other tiers get `403 PRESALE_ACCESS_REQUIRED`.
- **Seat limits.** Each tier has `maxTicketsPerOrder`. Going over it returns `422 SEAT_LIMIT_EXCEEDED`.
- **Re-verification.** Every request that sends `X-Membership-Id` is re-checked against the membership API. The result is cached for `MEMBERSHIP_CACHE_TTL_SECONDS`.
- **Holds.** A locked cart holds its seats for `SEAT_HOLD_SECONDS`. Expired holds are released on the next request.
- **Rotating tickets.** Barcodes for `ROTATING` tickets rotate every `BARCODE_ROTATION_SECONDS` (default 15). The barcode is `<ticketId>.<counter>.<HMAC>`. The HMAC secret never leaves the server.

### Error format

Every error response has the same shape:

```json
{ "error": { "code": "SEATS_UNAVAILABLE", "message": "Seat(s) no longer available: …", "requestId": "…" } }
```

Upstream errors are mapped to bridge codes. Examples: vendor `404` becomes `NOT_FOUND`, a vendor `409` becomes `CONFLICT`, and an upstream auth failure becomes `502 UPSTREAM_AUTH_FAILED` (a configuration problem on the bridge's side).

### Configuration (`.env`)

```env
PORT=3003
NODE_ENV=development

TICKET_VENDOR_BASE_URL=http://localhost:3001/v1
TICKET_VENDOR_API_KEY=demo-vendor-key
TICKET_VENDOR_PARTNER_ID=fanclub-partner-001

MEMBERSHIP_BASE_URL=http://localhost:3002/api
MEMBERSHIP_API_KEY=demo-membership-key

UPSTREAM_TIMEOUT_MS=8000
SEAT_HOLD_SECONDS=300
BARCODE_ROTATION_SECONDS=15
MEMBERSHIP_CACHE_TTL_SECONDS=60
```

`config.ts` validates every variable at startup. If one is missing or malformed, the process prints the problems and exits with code 1.

---

## 3. `frontend/`: Vite web app

### Purpose

A five-page mock of the Weverse ticketing journey. Each page is a route in the URL hash:

| Route | Page | What it does |
|---|---|---|
| `#/2a` | Weverse notice | Verifies the fan's membership on load. Shows tier and presale status, and the Box Office button (or "Upgrade Your Membership" for non-presale tiers) |
| `#/2b` | Tour dates | Lists the tour venues. "Presale Active" loads live availability for that venue |
| `#/2c?venue=<id>` | Seat selection | Shows live seat pairs grouped by section and price. "Reserve & Lock Seats" locks the chosen pair |
| `#/2d?venue=<id>` | Checkout | Shows the order summary and a live countdown to the hold expiry. "Complete Purchase" attaches billing and commits the order |
| `#/2e?venue=<id>` | Mobile ticket | Shows the ticket details and a live PDF417/QR barcode that rotates |

Pages 2B–2E are behind `PresaleGate`. Members without presale access are redirected back to 2A.

### Structure

```
frontend/
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts              # Dev proxy, EMAIL_ADDRESS injection
├── index.html
├── .env
├── .figma/make/site.json       # Figma Make metadata
└── src/
    ├── main.tsx
    ├── App.tsx                 # Hash router, presale route guard
    ├── routing.ts              # PageProps type, navigate() helper
    ├── env.d.ts               # Declares __EMAIL_ADDRESS__
    ├── index.css
    ├── api/
    │   ├── bridgeTypes.ts      # Frontend copies of the bridge's response types
    │   ├── bridgeClient.ts     # fetch wrapper for /bridge/*, BridgeError, describeError
    │   ├── purchaseSession.ts  # sessionStorage state across pages (member, cart, order)
    │   ├── purchaseFlow.ts     # Step-by-step orchestration (verify, lock, bill, commit, ticket)
    │   ├── seatOptions.ts      # Builds adjacent seat pairs per section and price
    │   ├── useBridgeAction.ts  # Hook: run an API call, then navigate, with pending/error state
    │   ├── useCountdown.ts     # Live countdown and mm:ss formatting
    │   └── format.ts           # Money and date formatting
    ├── components/
    │   ├── WeverseCommunityLayout.tsx / .css  # Shared page chrome
    │   ├── NoticeLayout.css                   # 2A styles
    │   ├── BridgeErrorNote.tsx                # Inline API error display
    │   ├── PresaleGate.tsx                    # Route guard for presale pages
    │   └── TicketBarcode.tsx                  # Renders PDF417/QR with bwip-js
    ├── pages/
    │   ├── Wireframe2A.tsx … Wireframe2E.tsx
    ├── data/
    │   └── tourVenues.ts       # Venue IDs (must match the vendor's event IDs)
    └── assets/
        └── weverse.assets.ts   # SVG icons and avatar images
```

### How a purchase flows through the code

| Step | Page | Function in `purchaseFlow.ts` | Bridge call |
|---|---|---|---|
| 1 | 2A loads | `verifyMembership()` | `POST /membership/verify` |
| 2 | 2B "Presale Active" | `loadAvailability(eventId)` | `GET /events/:id/availability` |
| 3 | 2C mounts / "Reserve" | `lockSeats(eventId, seatIds)` | `POST /carts/lock` |
| 4 | 2D "Complete Purchase" | `completePurchase()` | `PUT /carts/:id/billing`, then `PUT /carts/:id/commit` |
| 5 | 2E loads, then re-fetches on each rotation | `fetchMobileTicket()` | `GET /tickets/:ticketId` |

State between pages lives in `sessionStorage` under one key. A browser refresh keeps the member, cart and order. Each step also updates the session, so the next page can read it.

### Configuration (`.env`)

```env
# Fan-club account used for the whole flow (see the account table above)
EMAIL_ADDRESS=fan@example.com

# Where the dev proxy forwards /bridge/* (optional, default shown)
BRIDGE_URL=http://localhost:3003
```

`EMAIL_ADDRESS` has no `VITE_` prefix, so `vite.config.ts` injects it with `define` as `__EMAIL_ADDRESS__`. Restart the dev server after changing `.env`.

### `vite.config.ts` essentials

- `server.proxy` and `preview.proxy` forward `/bridge` to `BRIDGE_URL` with the prefix removed.
- `define` injects `__EMAIL_ADDRESS__`.
- `loadEnv(mode, process.cwd(), "")` reads every variable from `.env`.

### Changing the venue list

`src/data/tourVenues.ts` IDs must match the event IDs in `fanclub-demo`'s `tourSeed.ts`. If you add a venue, add it in both places and reseed the mock (`npm run start:fresh`).

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `Could not reach the ticketing bridge` on any page | Bridge not running on `:3003`, or `BRIDGE_URL` is wrong |
| Bridge fails at startup with "Invalid environment configuration" | A variable in the bridge `.env` is missing or malformed. The message lists which one |
| `502 UPSTREAM_AUTH_FAILED` | Bridge API keys or partner ID don't match the mock `.env` |
| `ECONNREFUSED` to `:3001` or `:3002` | `fanclub-demo` isn't running |
| `404 EVENT_NOT_FOUND` on availability | Mock not reseeded after adding tour events. Run `npm run start:fresh` |
| `409 SEATS_UNAVAILABLE` on lock | Those seats were sold or held earlier. Reseed, or pick another pair |
| Page 2B redirects to 2A | The account has no presale access (Silver, Basic, or an inactive membership) |
| "EMAIL_ADDRESS is not set" | Missing `.env` entry, or the dev server wasn't restarted after editing it |
| Barcode shows "Could not render barcode" | `bwip-js` not installed in `frontend` (`pnpm add bwip-js@^4`) |

Running `npx tsx src/e2e.ts` against a healthy stack is the quickest way to confirm each link in the chain works.
Rate the overall quality of Response A