# Epik High North America Tour: ticketing site

A React and TypeScript single-page app built with Vite. It recreates the tour page and adds a fan-club purchase flow (notice, tour dates, seat selection, checkout, mobile ticket) backed by the Show Stop ticketing bridge.

## Run locally

This site is one of five customer sites that run together in the Show Stop sandbox. It is not started on its own. From the **repository root** (Node 22.12+):

```sh
npm ci
npm run demo          # dev servers with hot reload
# or: npm run build && npm run demo:built
```

Open [http://127.0.0.1:4001/#/2a](http://127.0.0.1:4001/#/2a). The same command also starts the mock vendor and membership APIs, the ticketing bridge and the other four sites, with a fresh seeded database. No `.env` file, pnpm or separate backend is needed.

- **Fan account:** `epikhigh_fan@gmail.com` is signed in by default. It can be changed from this site's operator page, [http://127.0.0.1:4001/operator](http://127.0.0.1:4001/operator), which also has Decline payment, Expire hold and Reset controls. Reset affects all five sites. `EMAIL_ADDRESS` in a `.env` file is only a fallback if the sandbox config is unavailable.
- **Bridge:** the sandbox serves `/bridge` on the same origin and forwards it to the ticketing bridge on `:3003`.
- **Seating:** step 2C draws a live seating diagram from the event's inventory, and highlights the section of the selected seat option.
- See [SANDBOX.md](../SANDBOX.md) for the ports, operator controls and checks.

## Codebase Architecture

These are the files used to install dependencies, configure Vite (served on port 4001 by the sandbox), and load the app served from `index.html`:

```text
project/
|--- package.json
|--- vite.config.ts
|--- .figma/
        |--- make/
                |--- site.json
|--- index.html
|--- src/
        |--- main.tsx
        |--- App.tsx
        |--- index.css
        |--- components/
                |--- PageNav.tsx
                |--- WeverseNavBar.tsx
        |--- pages/
                |--- Wireframe2A.tsx
                |--- Wireframe2B.tsx
                |--- Wireframe2C.tsx
                |--- Wireframe2D.tsx
                |--- Wireframe2E.tsx
```
| URL | Page | Button that leads to the next page |
| --- | --- | --- |
| `http://localhost:4001/#/2a` (default) | 2A: Tour Notice | "Go to Native Tour Box Office (Tickets Tab)" |
| `http://localhost:4001/#/2b` | 2B: Tour Box Office | "Presale Active →" (either tour date) |
| `http://localhost:4001/#/2c` | 2C: Seat Selection | "Reserve & Lock Seats (2)" |
| `http://localhost:4001/#/2d` | 2D: Checkout | "Complete Purchase & Issue Tickets" |
| `http://localhost:4001/#/2e` | 2E: Wallet / SafeTix | (end of flow) |