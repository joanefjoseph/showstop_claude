# KOOM Live — Ticketing Web App

A React + TypeScript single-page app (Vite, port **4003**) for **KOOM 2026** at Terminal 5, Manhattan, on Oct 16, 2026. It combines the KOOM Live landing page with a members-only ticket purchase flow backed by the Show Stop ticketing bridge.

The event has two parts and three general-admission ticket types:

| Ticket type | Admits to | Price |
|---|---|---|
| KOOM Stage 2026 - Daytime Only | KOOM Stage 2026 - Daytime Conference | $37 |
| KOOM Live 2026 - Night Only | KOOM Live 2026 - Concert | $60 |
| KOOM 2026 - All Day Pass | Daytime Conference + Night Concert | $85 |

All tickets are general admission: there are no assigned seats, and the buyer chooses a ticket type and a quantity.

---

## What the app does

The app is four pages, selected by the URL hash:

| Route | Page | What happens |
|---|---|---|
| `#/2b` | **Landing** (`Wireframe2B.tsx`) | The KOOM Live page: hero, concert card and location, built from the KOOM static site's layout. **Tickets →** verifies the member's fan-club membership and loads live availability, then opens ticket selection. **Get Tickets** in the top bar scrolls to the concert card. |
| `#/2c?venue=<id>` | **Ticket selection** (`Wireframe2C.tsx`) | Shows the three ticket types with live prices and counts, a quantity picker (up to 4, or the member's tier limit) and a stage diagram. **Daytime Only** grays out the stage diagram, since that ticket doesn't include the concert. Reserving places a hold on tickets; the bridge picks which ones. |
| `#/2d?venue=<id>` | **Checkout** (`Wireframe2D.tsx`) | Order summary, a live countdown for the hold, and the payment method (demo). **Complete Purchase** attaches billing and commits the cart. |
| `#/2e?venue=<id>` | **Ticket** (`Wireframe2E.tsx`) | Order confirmation and the mobile ticket, with a rotating PDF417/QR barcode that refreshes automatically. |

Pages 2C–2E are members-only. `MembershipGate` verifies `EMAIL_ADDRESS` with the bridge before rendering them, for example after a refresh or a deep link. The current member, availability, cart and order are kept in `sessionStorage`, so a page refresh doesn't lose the purchase.

If the configured event has assigned seating instead of general admission, 2C automatically switches to a section map with adjacent seat-pair options.

### How the pieces fit together

```text
Browser (http://localhost:4003)
   │  /bridge/*  (Vite dev/preview proxy, prefix stripped)
   ▼
fanclub-ticketing-bridge   :3003   membership checks, carts, GA quantity locks, barcodes
   ├──► mock Ticket Vendor API   :3001   ┐
   └──► mock Membership API      :3002   ┘ fanclub-demo (SQLite: data/demo.db)
```

The app calls six bridge routes, all in `src/api/bridgeClient.ts`:

1. `GET /events/:eventId/availability`
2. `POST /membership/verify`
3. `POST /carts/lock`
   - `{ eventId, seatIds }` for assigned seating
   - `{ eventId, section, quantity }` for general admission
4. `PUT /carts/:cartId/billing`
5. `PUT /carts/:cartId/commit`
6. `GET /tickets/:ticketId`

---

## File architecture

```text
koomlive/
|--- index.html                   # HTML shell; loads src/main.tsx
|--- package.json                 # Scripts (dev / build / preview / format) and dependencies
|--- pnpm-lock.yaml
|--- .mise.toml                   # Tool versions: Node 22, pnpm 10.34.3
|--- .env                         # Local settings (not committed) — see "Configuration"
|--- vite.config.ts               # React + Tailwind plugins, port 4003, /bridge proxy,
|                                 # EMAIL_ADDRESS / KOOM_EVENT_ID defines, site metadata
|--- site.json                    # Page title, description, robots settings
|--- tsconfig.json
|--- public/
|   |--- images/                  # live-hero.png, feature.png, map.png, pin.svg, koom.svg, week.svg
|--- src/
    |--- main.tsx                 # Mounts <App /> and imports global styles
    |--- App.tsx                  # Hash routing (#/2b–#/2e) and the membership gate
    |--- routing.ts               # navigate(), section scrolling helpers
    |--- index.css                # Global styles (Tailwind + shared tokens)
    |--- vite-env.d.ts            # Types for the injected __EMAIL_ADDRESS__ / __KOOM_EVENT_ID__
    |--- pages/
    |   |--- Wireframe2B.tsx      # Landing page (KOOM Live) and the Tickets entry point
    |   |--- Wireframe2C.tsx      # Ticket type + quantity selection, stage diagram, hold
    |   |--- Wireframe2D.tsx      # Order summary, hold countdown, purchase
    |   |--- Wireframe2E.tsx      # Confirmation and mobile ticket with rotating barcode
    |--- components/
    |   |--- KoomLayout.tsx       # Site chrome: top bar and footer from the KOOM static site
    |   |--- KoomLayout.css       # Port of the KOOM style.css, scoped under .koom-page
    |   |--- KoomPurchase.css     # Purchase-flow styles in the KOOM theme
    |   |--- PurchasePageLayout.tsx # 2C–2E shell: intro band, fact strip, step tracker, card
    |   |--- MembershipGate.tsx   # Verifies membership before rendering 2C–2E
    |   |--- TicketBarcode.tsx    # Renders PDF417/QR with bwip-js, rotation progress bar
    |   |--- BridgeErrorNote.tsx  # Inline error message
    |--- api/
    |   |--- bridgeClient.ts      # Typed HTTP client for the six bridge routes
    |   |--- bridgeTypes.ts       # Bridge request/response types
    |   |--- purchaseFlow.ts      # Membership, availability, holds, purchase, ticket fetch
    |   |--- purchaseSession.ts   # Purchase state in sessionStorage
    |   |--- generalAdmission.ts  # GA detection, ticket-type options, quantity limits
    |   |--- seatOptions.ts       # Adjacent seat pairs (assigned-seating events only)
    |   |--- format.ts            # Currency and date formatting
    |   |--- useBridgeAction.ts   # Async action state, errors, navigation on success
    |   |--- useCountdown.ts      # Hold / barcode-rotation countdowns
    |--- data/
        |--- tourVenues.ts        # The KOOM 2026 event (id, date, venue, address)
        |--- ticketTypes.ts       # Ticket type names, access wording, "includes concert"
        |--- koomImages.ts        # Resolves image paths under public/images
```

### Where the data comes from

- **Prices and ticket counts** are live inventory from the bridge. They are seeded in `fanclub-demo/src/db/tourSeed.ts` (`KOOM_2026_SEATING`).
- **Ticket type wording**, and whether a type includes the concert (which drives the grayed-out stage), is in `src/data/ticketTypes.ts`.
- The two files are linked by the **section** name: `Daytime Only`, `Night Only`, `All Day Pass`. Keep them in sync.
- The **event id** (`koom-live-terminal-5` by default) must match the `event_id` seeded in `tourSeed.ts`.

---

## Running the app

### Prerequisites

- **Node.js 22** and **pnpm 10.34.3**. Either run `mise install` (reads `.mise.toml`) or use Corepack, which ships with Node.
- The two backend projects, running locally:
  - `fanclub-demo`: the mock Ticket Vendor (:3001) and Membership (:3002) APIs.
  - `fanclub-ticketing-bridge`: the bridge (:3003).

### 1. Start the backend

Start the mock APIs first, then the bridge, each in its own terminal. Both projects ship a `.env.example`; copy it to `.env` the first time. The script names below follow each project's `package.json`; check there if yours differ.

**Linux / macOS (bash)**

```bash
# Terminal 1 — mock vendor + membership APIs
cd fanclub-demo
cp .env.example .env          # first time only
npm install
npm run server                # seeds data/demo.db on first start

# Terminal 2 — ticketing bridge
cd fanclub-ticketing-bridge
cp .env.example .env          # first time only
npm install
npm run dev
```

**Windows (PowerShell)**

```powershell
# Terminal 1 — mock vendor + membership APIs
cd fanclub-demo
Copy-Item .env.example .env   # first time only
npm install
npm run server

# Terminal 2 — ticketing bridge
cd fanclub-ticketing-bridge
Copy-Item .env.example .env   # first time only
npm install
npm run dev
```

Check that the bridge serves the KOOM event:

```bash
# Linux / macOS
curl -s http://localhost:3003/events/koom-live-terminal-5/availability
```

```powershell
# Windows
$a = Invoke-RestMethod http://localhost:3003/events/koom-live-terminal-5/availability
$a.sections | Select-Object section, availableCount, @{n='price';e={$_.priceRange.min.amount}}
```

You should see three sections: `All Day Pass` (85), `Daytime Only` (37) and `Night Only` (60).

### 2. Configure the app

Create `koomlive/.env`. `EMAIL_ADDRESS` must belong to an **active** member seeded by `fanclub-demo` (see `fanclub-demo/src/db/seed.ts`).

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `EMAIL_ADDRESS` | yes | — | The fan-club member who is "logged in" |
| `BRIDGE_URL` | no | `http://localhost:3003` | Where the Vite proxy sends `/bridge` requests |
| `KOOM_EVENT_ID` | no | `koom-live-terminal-5` | Vendor event id to sell tickets for |
| `PORT` | no | `4003` | Dev/preview port (read from the shell environment, not `.env`) |

**Linux / macOS**

```bash
cd koomlive
cat > .env <<'EOF'
EMAIL_ADDRESS=member@example.com
BRIDGE_URL=http://localhost:3003
EOF
```

**Windows (PowerShell)**

```powershell
cd koomlive
@"
EMAIL_ADDRESS=member@example.com
BRIDGE_URL=http://localhost:3003
"@ | Set-Content .env
```

Restart the dev server after changing `.env`; the values are injected at startup.

### 3. Install and start

**Linux / macOS**

```bash
corepack pnpm install
corepack pnpm dev                 # http://localhost:4003/
```

**Windows (PowerShell)**

```powershell
corepack pnpm install
corepack pnpm dev                 # http://localhost:4003/
```

Open **http://localhost:4003/** and click **Tickets →** on the Live Concert card.

To use a different port:

```bash
PORT=4010 corepack pnpm dev                 # Linux / macOS
```

```powershell
$env:PORT='4010'; corepack pnpm dev         # Windows
Remove-Item Env:PORT                        # clear it again afterwards
```

The server uses a strict port: if 4003 is taken it exits instead of picking another port. If you previously set `$env:PORT='4002'` for the comedy app in the same PowerShell window, clear it first.

### 4. Production build (optional)

```bash
corepack pnpm build      # outputs dist/
corepack pnpm preview    # serves dist/ on port 4003, with the same /bridge proxy
```

`/bridge` is proxied only by the Vite dev and preview servers. If you host `dist/` elsewhere, that server must forward `/bridge/*` to the bridge with the `/bridge` prefix removed.

---

## Resetting demo data

Purchases mark tickets as sold in `fanclub-demo/data/demo.db`. To start fresh, or after changing `tourSeed.ts`:

1. Stop the mock APIs.
2. Delete the database (or run the project's reset script).
3. Start the mock APIs again.
4. Restart the bridge.

```bash
rm fanclub-demo/data/demo.db                   # Linux / macOS
```

```powershell
Remove-Item fanclub-demo\data\demo.db          # Windows
```

To clear the app's in-browser purchase state, close the tab or remove the `weverse-purchase-session` key from Session Storage in the browser dev tools.

---

## Troubleshooting

| Message / symptom | Cause and fix |
|---|---|
| `Could not reach the ticketing bridge — is it running on :3003? (BRIDGE_UNREACHABLE)` | The bridge isn't running, or `BRIDGE_URL` is wrong. |
| `EMAIL_ADDRESS is not set in .env` | Add it to `koomlive/.env` and restart the dev server. |
| `No fan-club membership found for …` | The email isn't a seeded member. Use one from `fanclub-demo/src/db/seed.ts`. |
| `Event 'koom-live-terminal-5' not found` | The database was seeded before the KOOM event existed. Reset the demo data. |
| `Only N Night Only tickets are left` / `… sold out` | Not enough stock of that type. Lower the quantity or pick another type. |
| `SEAT_LIMIT_EXCEEDED` | The quantity is above the member tier's per-order limit. |
| `HOLD_EXPIRED` on checkout | The hold (about 5 minutes) ran out. Go back to 2C and reserve again. |
| Dev server exits with "port in use" | Something else is on 4003, or `PORT` is set in your shell. |

---

## Notes and known limitations

- **Payment is a demo.** Checkout always sends a saved-wallet token. The card row on 2D is static.
- **Multiple tickets:** the ticket page shows the barcode for the first ticket in the order and labels it "1 of N".
- **Stock per type is separate.** Each ticket type has its own allocation in the seed (300 / 300 / 200). Selling an All Day Pass doesn't reduce Night Only stock.
- **Prices are all-in** ($0 fees in the seed). The event start time in the seed is a placeholder.
- **Fonts:** the KOOM styles name DM Sans, DM Mono and Space Grotesk but don't load them, matching the original static site. Add a Google Fonts `@import` to `KoomLayout.css` to use them.
- **Placeholder glyphs:** a few icons in the footer and the "View Location" button were placeholders (`SOCIAL_GLYPHS` in `KoomLayout.tsx`, `VIEW_LOCATION_GLYPH` in `Wireframe2B.tsx`). Replace them with the originals from the static site.
- **Changing ticket types:** edit both `fanclub-demo/src/db/tourSeed.ts` (price, stock) and `src/data/ticketTypes.ts` (wording, concert access), keeping the section names identical, then reset the demo data.