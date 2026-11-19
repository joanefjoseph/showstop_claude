# David Jin Comedy

This folder contains a React and TypeScript single-page app built with Vite. It combines a David Jin comedy/tour site with a ticket purchase flow backed by the Show Stop ticketing bridge.

## Run locally

This site is one of five customer sites that run together in the Show Stop sandbox. It is not started on its own. From the **repository root** (Node 22.12+):

```sh
npm ci
npm run demo          # dev servers with hot reload
# or: npm run build && npm run demo:built
```

Open [http://127.0.0.1:4002/#/2a](http://127.0.0.1:4002/#/2a). The same command also starts the mock vendor and membership APIs, the ticketing bridge and the other four sites, with a fresh seeded database. No `.env` file, pnpm or separate backend is needed.

- **Fan account:** `funnygirl@gmail.com` is signed in by default. It can be changed from this site's operator page, [http://127.0.0.1:4002/operator](http://127.0.0.1:4002/operator), which also has Decline payment, Expire hold and Reset controls. Reset affects all five sites. `EMAIL_ADDRESS` in a `.env` file is only a fallback if the sandbox config is unavailable.
- **Bridge:** the sandbox serves `/bridge` on the same origin and forwards it to the ticketing bridge on `:3003`.
- **Seating:** step 2C draws a live seating diagram from the event's inventory, and highlights the section of the selected seat option.
- See [SANDBOX.md](../SANDBOX.md) for the ports, operator controls and checks.

## Architecture

```text
davidjin/
|--- index.html                 # HTML shell; loads the React entry point
|--- package.json               # Scripts and React/Vite dependencies
|--- vite.config.ts             # Vite, React/Tailwind plugins, site metadata,
|                               # environment definitions, and /bridge proxy
|--- site.json                  # Site metadata used by the Vite HTML plugin
|--- public/
|   |--- images/                # Site logo, profile image, and other static assets
|--- src/
    |--- main.tsx               # Mounts App and imports global styles
    |--- App.tsx                # Hash-based page selection and membership gate
    |--- routing.ts             # Hash navigation and section scrolling helpers
    |--- index.css              # Global styles and design tokens
    |--- pages/
    |   |--- Wireframe2B.tsx    # Comedy landing page, shows, and availability entry
    |   |--- Wireframe2C.tsx    # Live seat selection and seat locking
    |   |--- Wireframe2D.tsx    # Order summary, payment, and purchase commit
    |   |--- Wireframe2E.tsx    # Confirmed mobile ticket and barcode
    |--- components/
    |   |--- ComedyLayout.tsx   # Shared navigation, footer, and site chrome
    |   |--- ComedyLayout.css
    |   |--- PurchasePageLayout.tsx
    |   |--- MembershipGate.tsx # Verifies purchase-page membership access
    |   |--- TicketBarcode.tsx  # Renders QR/PDF417 barcodes and rotation indicator
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
        |--- tourVenues.ts      # On-sale show metadata used across the flow
```

`index.html` loads `src/main.tsx`, which mounts `App`. `App` reads the URL hash to render a page and applies `MembershipGate` to the purchase pages. The `#/2b`, `#/2c`, `#/2d`, and `#/2e` routes represent the show listing, seat selection, checkout, and ticket respectively; the selected venue is passed as a `venue` query parameter in the hash. The landing page verifies membership and fetches event availability before navigating to seat selection. The purchase pages use `purchaseFlow.ts` to lock seats, attach billing, commit the cart, and fetch the resulting mobile ticket. The current member, availability, cart, and order are kept in `sessionStorage` by `purchaseSession.ts`.

`bridgeClient.ts` sends requests through the Vite `/bridge` proxy. It supports membership verification, event availability, seat locking, billing, cart commit, and mobile-ticket retrieval. The ticket page refreshes rotating barcode data as needed, and `TicketBarcode.tsx` renders it with `bwip-js`.
