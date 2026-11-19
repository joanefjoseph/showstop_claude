# Show Stop: Fanclub Ticketing Sandbox

This repository simulates the full concert-ticket journey for five artist sites: a fan verifies their fan-club membership, checks live seat inventory, locks seats on a seating diagram, pays, and receives a rotating mobile ticket barcode. Everything runs locally against mock providers with synthetic data. No real payments are taken.

> **Quick start** (Node 22.12+): from the repository root run `npm ci`, then `npm run demo`. Open any site from the table below. See [SANDBOX.md](SANDBOX.md) for the operator controls, walkthrough, checks and the boundaries of what is simulated.

## Components

| Directory | Role | Port |
|---|---|---|
| `fanclub-demo/` | Mock upstream services: a ticket-vendor API, a membership API, and a SQLite database behind both | Vendor `3001`, Membership `3002` (API console `3004` when run on its own) |
| `fanclub-ticketing-bridge/` | Express API gateway the sites talk to. It validates requests, applies business rules and calls the two mocks | `3003` |
| `frontend/` | Weverse / BTS site (BTS World Tour "ARIRANG") | `4000` |
| `epikhigh/` | Epik High North America Tour site | `4001` |
| `davidjin/` | David Jin Comedy site | `4002` |
| `koomlive/` | KOOM Live site, with assigned seating and general admission | `4003` |
| `jaypark/` | Jay Park World Tour site, with EN / 한 / ES toggle | `4004` |
| `scripts/` | `sandbox.ts` (starts everything), `operator.html` (operator controls), `regression.ts` (checks) | |

The directories must sit side by side. `fanclub-demo/src/bridgeContracts.ts` imports types from `../../fanclub-ticketing-bridge/src/types/`.

Each customer site is a React and TypeScript Vite app with the same five pages, selected by the URL hash: `#/2a` landing or notice, `#/2b` tour dates or sign-in, `#/2c` seat selection with a live seating diagram, `#/2d` checkout, `#/2e` mobile ticket. Every site has its own README with its branding and layout details.

## Running the sandbox

```sh
npm ci
npm run demo            # dev servers with hot reload
# or
npm run build && npm run demo:built
```

Keep the terminal open; `Ctrl+C` stops everything. Startup seeds fresh inventory, with event dates moved forward from launch. Start only one instance.

| Site | URL | Operator controls | Default fan |
|---|---|---|---|
| Weverse / BTS | http://127.0.0.1:4000/#/2a | `:4000/operator` | `bts_army@gmail.com` |
| Epik High | http://127.0.0.1:4001/#/2a | `:4001/operator` | `epikhigh_fan@gmail.com` |
| David Jin | http://127.0.0.1:4002/#/2a | `:4002/operator` | `funnygirl@gmail.com` |
| KOOM Live | http://127.0.0.1:4003/#/2a | `:4003/operator` | `fan@example.com` |
| Jay Park | http://127.0.0.1:4004/#/2a | `:4004/operator` | `jpark_fan@gmail.com` |

No `.env` files are needed. The runner configures the mock services and the bridge itself, and serves each site's `/bridge` path on the same origin.

Checks:

```sh
npm run typecheck       # all sites, services and scripts
npm test                # integration + regression checks on separate ports
npm run build           # production builds of all five sites
```

The tests use ports 4001 to 4003 for the services, so stop the sandbox before running them.

## How the pieces connect

```
 Browser (one of the five sites, ports 4000-4004)
    |  fetch('/bridge/...')            fetch('/sandbox/config')
    v
 Sandbox server (scripts/sandbox.ts): same-origin /bridge proxy, operator controls
    |
    v
 Bridge (Express :3003)
    +--------------------+---------------------+
    v                                          v
 Ticket vendor mock (:3001, /v1)     Membership mock (:3002, /api)
    +---------------- both read/write ----------+
              work/sandbox.db (generated, git-ignored)
```

- **Site to bridge.** Sites never call the mocks directly. Requests go to `/bridge/*` on their own origin, which the sandbox forwards to the bridge, so no CORS setup is needed.
- **Fan account.** Each site fetches `/sandbox/config` and re-checks it every 3 seconds. When the operator switches member or resets, the purchase session is cleared and the fan returns to the first page.
- **Bridge to mocks.** The bridge calls the vendor and membership APIs with the demo API keys set by the runner.
- **Cart ownership.** Billing and commit require the cart owner's `X-Membership-Id`.
- **Seating diagram.** Step 2C draws the venue from the event's live inventory (floor block, lower and upper levels around the stage), highlights the selected option's section and shows remaining seats.

## Running a service on its own

The services can still run independently, for example for the reference docs below. Start them in this order: `fanclub-demo`, then `fanclub-ticketing-bridge`. Each project has a `.env.example` to copy to `.env`. `fanclub-demo` is started with `npm run start:fresh` (reseeds) or `npm run start`; the bridge with `npm run dev`. Verify with `curl http://localhost:3003/health` and `cd fanclub-demo && npx tsx src/e2e.ts` (expects the bridge to be running). The sites themselves are started through `npm run demo`.

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

## 3. Customer sites (`frontend/`, `epikhigh/`, `davidjin/`, `koomlive/`, `jaypark/`)

### Purpose

Five Vite + React web apps that mimic each artist's ticketing journey over the same bridge API. Each page is a route in the URL hash:

| Route | What it does |
|---|---|
| `#/2a` | Landing page or notice. Some sites verify the fan's membership here |
| `#/2b` | Tour dates or sign-in. Members with presale access can open a show |
| `#/2c?venue=<id>` | Seat selection: live seating diagram plus seat-pair options (KOOM Live also sells general-admission types). "Reserve & Lock Seats" holds the selection |
| `#/2d?venue=<id>` | Checkout with a live hold countdown. Completes billing and commit, or offers "Choose seats again" when the hold has expired |
| `#/2e?venue=<id>` | Mobile ticket with a rotating barcode, one tab per purchased ticket |

Later pages are behind a gate (`PresaleGate` or `MembershipGate`) that redirects to the sign-in page when the member is missing or ineligible.

### Shared structure

```
<site>/
├── package.json
├── vite.config.ts              # Site metadata, EMAIL_ADDRESS fallback define
├── index.html
├── site.json                   # Site metadata
├── public/                     # Static artwork
└── src/
    ├── main.tsx                # Mounts App; syncs with /sandbox/config
    ├── App.tsx                 # Hash router, route guard
    ├── routing.ts
    ├── api/
    │   ├── bridgeTypes.ts      # Copies of the bridge's response types
    │   ├── bridgeClient.ts     # fetch wrapper for /bridge/*, BridgeError, describeError
    │   ├── purchaseSession.ts  # sessionStorage state (member, cart, order)
    │   ├── purchaseFlow.ts     # verify, lock, bill, commit, ticket
    │   ├── seatOptions.ts      # Adjacent seat options per section and price
    │   ├── useBridgeAction.ts, useCountdown.ts, format.ts
    ├── components/             # Site-specific layout, gate, TicketBarcode, BridgeErrorNote
    ├── pages/                  # Wireframe2A.tsx ... Wireframe2E.tsx
    └── data/tourVenues.ts      # Venue ids (must match the vendor's event ids)
```

`koomlive/` adds `api/generalAdmission.ts` and `data/ticketTypes.ts`; `jaypark/` adds `i18n.ts` and `data/faq.ts`.

### How a purchase flows through the code

| Step | Page | Function in `purchaseFlow.ts` | Bridge call |
|---|---|---|---|
| 1 | Sign-in | `verifyMembership()` | `POST /membership/verify` |
| 2 | Show selection | `loadAvailability(eventId)` | `GET /events/:id/availability` |
| 3 | 2C "Reserve" | `lockSeats(eventId, seatIds)` (`lockTickets` for general admission) | `POST /carts/lock` |
| 4 | 2D "Complete Purchase" | `completePurchase()` | `PUT /carts/:id/billing`, then `PUT /carts/:id/commit` |
| 5 | 2E loads, then re-fetches on each rotation | `fetchMobileTicket(index)` | `GET /tickets/:ticketId` |

An expired hold (`410`) is marked expired in the session so 2D can send the fan back to seat selection. A billing `409` on retry is treated as "already attached".

State between pages lives in `sessionStorage` under `purchase-session`. A reload keeps the member, cart and order.

### Configuration

The sandbox needs no configuration. The fan's email is read from `sessionStorage` (`sandbox-email`, set from `/sandbox/config`); `EMAIL_ADDRESS` in a site's `.env` is only a fallback, defaulting to the site's fan from the table above.

### Changing the venue list

IDs in a site's `src/data/tourVenues.ts` must match the event IDs in `fanclub-demo/src/db/tourSeed.ts`. If you add a venue, add it in both places; the sandbox reseeds on every start.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "The ticketing service is unavailable" on any page | The sandbox is not running, or a service crashed. Restart `npm run demo` |
| "Port ... is already in use" at startup | An earlier sandbox or the tests are still running. Stop them first |
| Bridge fails at startup with "Invalid environment configuration" | Only when running the bridge alone: a variable in its `.env` is missing or malformed |
| `404 EVENT_NOT_FOUND` on availability | The site's venue id has no matching event in `tourSeed.ts` |
| `409 SEATS_UNAVAILABLE` on lock | Those seats were sold or held. Use Reset on the operator page, or pick another option |
| Checkout says the hold expired | Use "Choose seats again" to reserve again |
| Checkout is declined | "Decline payment" is on in the operator page. Turn it off and retry |
| A site returns to its first page by itself | The operator switched member or reset the environment |
| A site redirects to the sign-in page | The fan account has no presale access or an inactive membership |
| `better-sqlite3` fails to load | Use Node 22.12+, or run `npm rebuild better-sqlite3` |

`npm test` is the quickest way to confirm each link in the chain works.
