# Frontend: Weverse / BTS site

A React and TypeScript single-page app built with Vite. It replicates the Weverse notice and box-office pages for the BTS World Tour "ARIRANG" and adds a presale ticket purchase flow backed by the Show Stop ticketing bridge.

## Run locally

From the **repository root** (Node 22.12+):

```sh
npm ci
npm run demo          # dev server with hot reload
# or: npm run build && npm run demo:built
```

Open http://127.0.0.1:4001/#/2a. The command starts the mock services, the bridge and all six customer sites. Operator controls for this site are at http://127.0.0.1:4001/operator. See [SANDBOX.md](../SANDBOX.md).

## Pages

| Route | Page | What it does |
|---|---|---|
| `#/2a` | Notice | Weverse tour notice. The default member `bts_army@gmail.com` is verified automatically |
| `#/2b` | Tour box office | Tour dates; "Presale Active" opens seat selection for that city |
| `#/2c?venue=<id>` | Seat selection | Live seating diagram around the stage plus seat-pair options. The diagram highlights the section of the selected option and shows remaining seats. "Reserve & Lock Seats" holds them |
| `#/2d?venue=<id>` | Checkout | Order summary and hold countdown. "Complete Purchase & Issue Tickets", or "Choose seats again" if the hold has expired |
| `#/2e?venue=<id>` | Mobile ticket | One tab per purchased ticket, each with a rotating barcode |

Pages 2B to 2E sit behind `PresaleGate`. A page that needs a member who has no presale access sends the fan back to 2A.

## How it talks to the backend

- `src/api/bridgeClient.ts` calls `/bridge/*`. The sandbox serves that path on the same origin and forwards it to the bridge on `:3003`.
- `src/main.tsx` polls `/sandbox/config`. When an operator switches member or resets the environment, the purchase session is cleared and the fan returns to 2A.
- The fan's email comes from that config (`sessionStorage` key `sandbox-email`), with `EMAIL_ADDRESS` from `.env` only as a fallback.
- Purchase state lives in `sessionStorage` (`purchase-session`) and survives a reload.
- Billing and commit send the cart owner's `X-Membership-Id`.

Venue ids in `src/data/tourVenues.ts` must match the event ids in `fanclub-demo/src/db/tourSeed.ts`.
