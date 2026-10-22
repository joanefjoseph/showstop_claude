# Jay Park World Tour: Serenades & Body Rolls (demo)

A React and TypeScript single-page app built with Vite. It recreates the
"2026 Jay Park World Tour [Serenades & Body Rolls] with LNGSHOT" tour page and
adds a fan-club presale purchase flow behind it, backed by the Show Stop
ticketing bridge.

This is a demo. No real payments are taken, no real password is checked, and
every external link (ticket vendors, Privacy Policy, Contact, FAQ emails,
Melon Ticket sign-up) is intentionally a dead link.

## What it does

The app has five pages, selected by the URL hash:

| Route   | Page                  | What happens |
|---------|-----------------------|--------------|
| `#/2a`  | Tour page             | A copy of the live tour site: hero, tour dates with region filters (All / LATAM / North America / Europe & UK), FAQ accordion, and an EN / 한 / ES language toggle. Every "Tickets" button opens the presale gate for that show. |
| `#/2b`  | Presale sign-in gate  | Explains that presale is only for members of Jay Park's official fanclub, JWalkerz, and that general on-sale opens in 6 days. Offers two cards: sign in with a Melon Ticket account, or join JWalkerz (dead link). Also has the language toggle. |
| `#/2c`  | Seat selection        | Live seat map and adjacent seat-pair options from the bridge. "Reserve & Lock Seats" places a hold. |
| `#/2d`  | Checkout              | Order summary, hold countdown, demo payment method, and "Complete Purchase & Issue Tickets". |
| `#/2e`  | Mobile ticket         | Order confirmation with a rotating barcode that refreshes from the bridge. |

The selected show travels between pages as a `venue` query parameter in the
hash, for example `#/2c?venue=jaypark-new-york`.

### Sign-in rules

- Signing in on 2B is the only way into 2C. A successful sign-in shows a
  confirmation pop-up for about 1.5 seconds and then moves to seat selection.
- Opening 2B always signs the fan out first, so returning to it (Back button,
  refresh, deep link) requires signing in again.
- Returning to 2A also signs the fan out.
- Opening 2C, 2D or 2E without being signed in redirects to 2B for that show.
- The username box is filled from `MELON_USERNAME` and is display-only. The
  password box shows ten masked characters and is not checked. The actual
  membership check is made against `EMAIL_ADDRESS` through the bridge.

### Languages

2A and 2B are available in English, Korean and Spanish. The choice is saved in
the browser. FAQ answers are English only and fall back to English in the
other languages. The purchase pages (2C to 2E) are English only.

## Run locally

### Prerequisites

- Node 22 and pnpm 10 (pinned in `.mise.toml`).
- The mock vendor and membership APIs (`fanclub-demo`, ports 3001 and 3002)
  and the ticketing bridge (`fanclub-ticketing-bridge`, port 3003) must be
  running. See their own READMEs for how to start them.
- The mock vendor database must contain an event for each tour stop, with an
  event id equal to the `id` in `src/data/tourVenues.ts`
  (for example `jaypark-sao-paulo`). A show without a matching event will show
  a bridge error on the seat selection page.

### Configuration

Create a `.env` file in this folder:

```
EMAIL_ADDRESS=<email of a member in the mock membership API>
MELON_USERNAME=<username to show in the sign-in box>
# Optional. Defaults to http://localhost:3003
BRIDGE_URL=http://localhost:3003
```

Restart the dev server after editing `.env`.

### Static assets

Place these in `public/images/`:

- `new-jaypark-lngshot-logo.png`
- `new-jaypark-lngshot-art.png`
- `new-jaypark-lngshot-morevision-logo.png`
- `jwalkerz.jpg` (the JWalkerz membership recruitment poster)

Optionally place `DrukWide-Bold.otf`, `Montserrat-Regular.ttf` and
`Montserrat-Bold.ttf` in `public/fonts/`. Without them the browser uses
fallback fonts.

### Start

```powershell
corepack pnpm install
npm run dev
```

Open [http://localhost:4004/](http://localhost:4004/). Vite defaults to port
`4004`; set `PORT` to override it.

## Architecture

```text
jaypark/
|--- index.html                 # HTML shell; loads the React entry point
|--- package.json               # Scripts and React/Vite dependencies
|--- pnpm-lock.yaml
|--- tsconfig.json
|--- .mise.toml                 # Node and pnpm versions
|--- vite.config.ts             # Vite plugins, site metadata, port 4004,
|                               # .env definitions, and /bridge proxy
|--- site.json                  # Page title and description for the HTML shell
|--- .env                       # EMAIL_ADDRESS, MELON_USERNAME, BRIDGE_URL
|--- public/
|   |--- images/                # Tour logo, hero art, More Vision logo, JWalkerz poster
|   |--- fonts/                 # Optional Druk Wide and Montserrat files
|--- src/
    |--- main.tsx               # Mounts App and imports global styles
    |--- App.tsx                # Hash-based page selection and membership gate
    |--- routing.ts             # Hash navigation and section scrolling helpers
    |--- i18n.ts                # EN/KO/ES strings and shared language state
    |--- assets.ts              # Paths to the images in public/images
    |--- index.css              # All styles: tour page port, purchase pages, accents
    |--- vite-env.d.ts          # Types for the values injected from .env
    |--- pages/
    |   |--- Wireframe2A.tsx    # Tour page: hero, tour dates, FAQ
    |   |--- Wireframe2B.tsx    # Presale gate: Melon Ticket sign-in and Join card
    |   |--- Wireframe2C.tsx    # Live seat map, seat options, and seat locking
    |   |--- Wireframe2D.tsx    # Order summary, payment, and purchase commit
    |   |--- Wireframe2E.tsx    # Confirmed mobile ticket and barcode
    |--- components/
    |   |--- TourLayout.tsx     # Shared top bar, language toggle, footer, link handling
    |   |--- PurchasePageLayout.tsx # Shell for 2C-2E: show header and step indicator
    |   |--- MembershipGate.tsx # Redirects signed-out visitors from 2C-2E to 2B
    |   |--- TicketBarcode.tsx  # Renders QR/PDF417 barcodes and the rotation bar
    |   |--- BridgeErrorNote.tsx
    |--- api/
    |   |--- bridgeClient.ts    # Typed HTTP client for bridge endpoints
    |   |--- bridgeTypes.ts     # Bridge request/response models
    |   |--- purchaseFlow.ts    # Membership, availability, cart, order, and ticket flow
    |   |--- purchaseSession.ts # Purchase state persisted in sessionStorage
    |   |--- seatOptions.ts     # Builds adjacent seat-pair options from inventory
    |   |--- format.ts          # Currency/date formatting helpers
    |   |--- useBridgeAction.ts # Shared async action state and error handling
    |   |--- useCountdown.ts
    |--- data/
        |--- tourVenues.ts      # The 24 tour stops; each id is a vendor event id
        |--- faq.ts             # FAQ copy captured from the live tour page
```

### How the pieces fit

`index.html` loads `src/main.tsx`, which mounts `App`. `App` reads the URL
hash to pick a page and wraps 2C, 2D and 2E in `MembershipGate`.

`TourLayout` provides the chrome for every page. It also handles links:
`#/route` links navigate between pages, `#section` links scroll to a section
(or open 2A at that section from another page), and everything else is
swallowed as a dead link.

The purchase pages call `purchaseFlow.ts`, which uses `bridgeClient.ts` to
reach the bridge through the Vite `/bridge` proxy. The bridge operations used
are membership verification, event availability, seat lock, billing, cart
commit and mobile-ticket retrieval. The current member, availability, cart and
order are kept in `sessionStorage` by `purchaseSession.ts`, so they last for
the browser tab only.

### Styling

`index.css` is a port of the original tour page's stylesheet, followed by
styles for the presale gate and purchase pages. 2A uses only the original
black-and-white rules. The dark blue and green accents apply to 2B through 2E
only. Tailwind is installed but not imported, because its reset would change
the original page's spacing.

## Adding or changing a show

Edit `src/data/tourVenues.ts`. Each entry needs an `id`, a `region`
(`latam`, `na` or `eu`), a `date`, a `city` and a `venue`. The `id` must match
an event id seeded in the mock vendor API.