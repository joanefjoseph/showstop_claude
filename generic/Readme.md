# Generic Tour Demo (NOVA — Afterglow World Tour 2027)

A vendor-neutral touring-artist site for demos to labels and managers who have no specific artist in mind. It combines the main features of the five artist demos. The artist is fictional.

This site runs inside the Show Stop sandbox and is not started on its own. From the **repository root** (Node 22.12+):

```sh
npm ci
npm run demo
```

Open [http://127.0.0.1:4000/#/2a](http://127.0.0.1:4000/#/2a). Operator controls are at [http://127.0.0.1:4000/operator](http://127.0.0.1:4000/operator). The default fan is `tourfan@example.com` (Gold tier, presale access). See [../SANDBOX.md](../SANDBOX.md) for the full guide.

## Pages

| Route | Page |
|---|---|
| `#/2a` | Tour landing page: poster hero with logo, six dates (presale dates tagged), and an FAQ |
| `#/2b?venue=<id>` | Fan club sign-in. Verifies membership, and presale access on presale dates. Offers "Join NOVA Nation" |
| `#/2c?venue=<id>` | Seat selection with a live seat map |
| `#/2d?venue=<id>` | Payment with a 5-minute hold timer |
| `#/2e?venue=<id>` | Rotating-barcode ticket plus add-ons |

Pages 2C to 2E send the fan back to 2B if they are not signed in, or lack presale access for a presale date.

## Behaviour

- **Presale:** New York, Los Angeles and Toronto are presale; Chicago, Austin and London are general on-sale. Every date needs sign-in. Presale dates also need a tier with presale access. In the operator page, pick the Basic fan (`basic@example.com`) to show the denial.
- **Seating at every venue:** **Floor** is general admission (1 to 4 tickets); **Club** and **Lower Bowl** are reserved seats such as A11, chosen as adjacent pairs. The seat map highlights the current choice.
- **Add-ons on 2E:** a discounted tour bundle (tee + album) and a VIP upgrade (early entry, soundcheck, laminate). These are simulated: stored in `sessionStorage` only, not sent to the ticketing service and not charged.

## Re-skinning for a prospect

- Artist, tour, fan club, tagline, stops and add-on prices: `src/data/tour.ts`. Stop ids must match `GENERIC_STOPS` in `../fanclub-demo/src/db/tourSeed.ts`.
- Accent colours and theme: CSS variables at the top of `src/index.css`.

## Layout

```
generic/
|--- index.html, vite.config.ts, site.json   # port 4000, /bridge proxy
|--- src/
     |--- App.tsx, routing.ts                # hash routes and guard
     |--- data/tour.ts                       # branding, stops, add-ons
     |--- pages/Wireframe2A..2E.tsx
     |--- components/                        # TourLayout, MembershipGate, SeatMap, TicketBarcode
     |--- api/                               # bridge client and purchase flow
```
