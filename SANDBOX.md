# Show Stop sandbox environment — handoff

## Start

From the repository root (Node 22.12+):

```sh
npm ci
npm run build
npm run demo:built
```

Keep the terminal open; Ctrl+C stops all services. The existing restart shortcut starts the built copy on this computer. Start only one instance. Startup seeds fresh inventory.

Customer sites (all started together; see "All five sites" below): Weverse/BTS http://127.0.0.1:4000/#/2a, Epik High :4001, David Jin :4002, KOOM Live :4003, Jay Park :4004.

Operator controls: each site has its own, for example http://127.0.0.1:4000/operator or http://127.0.0.1:4001/operator.

Keep the operator page on your screen, separate from the page you present. It is not linked from the fan site.

## Walkthrough (Weverse site)

The other sites follow the same steps (tour page, show selection, seat selection with seating diagram, checkout, tickets) with their own branding. KOOM Live also offers general-admission ticket types.

1. Open the notice page. The default BTS Army account is verified automatically and appears as @CaratArmyStay.
2. Click Go to Native Tour Box Office (Tickets Tab).
3. Select Presale Active for New York or another city.
4. Choose a seat option. The live seating diagram highlights its section around the stage and shows remaining inventory. Click Reserve & Lock Seats.
5. Review the live countdown and order total, then click Complete Purchase & Issue Tickets.
6. Open Ticket 1 and Ticket 2. Each has a distinct seat and rotating barcode. Reload preserves the current purchase session.

The original Weverse layout, colors, artwork, sidebar, tabs, membership cards, and placeholder navigation are retained. No middleware branding, presenter panel, demo labels, or added disclaimers appear in the customer journey. Unrelated navigation and wallet-export/merch links remain intentional visual placeholders.

## Operator controls

- Member / Switch member: active BTS Army, Basic without presale, expired, or missing membership. The fan page returns to the notice screen within about three seconds.
- Decline payment: enable before checkout to exercise failure. Disable and retry the same purchase to recover without duplicate tickets.
- Active holds / Expire: expire a cart. On the next checkout attempt the vendor rejects it; Choose seats again recovers. Natural countdown expiry offers the same recovery.
- Reset orders and inventory: clears all purchases and holds for every site, restores each site's default member, and restarts open fan sessions. This affects all tabs sharing the environment.
- Service status and requests: inspect real HTTP activity off the customer-facing screen.

## Functional improvements

One-command startup, resettable fixtures, fixed seed CLI initialization order, generated runtime database instead of checked-in SQLite files, cart ownership checks on billing/commit, stable purchase retry keys, expired-hold recovery, all tickets accessible, stale barcodes hidden during refresh, network timeouts, and session invalidation after reset.

The earlier redesign is superseded. Placeholder navigation was intentional and is preserved. Original styles and layout components are restored from the repository baseline. Page changes cover functional recovery, multiple-ticket selection, removing middleware/device-certification wording, and the dynamic seating diagram migrated from davidjin.

## Services and checks

Membership API: 3002. Vendor API: 3001. Middleware: 3003. Customer sites and same-origin proxies: 4000 to 4004. All bind to loopback. Runtime data is in ignored work/sandbox.db. Live event dates move forward on reset; original notice copy and images retain their reference dates.

```sh
npm run typecheck
npm test
npm run build
```

`npm run typecheck` and `npm run build` cover all five sites. The API suite has 42 integration checks and 21 regression checks. Tests use separate ports 4001–4003 and work/test.db. Browser verification covers the restored notice-to-checkout-to-ticket journey and both tickets.

This environment makes real HTTP calls and SQLite transactions against mock providers. Member IDs are fixture identities, not production authentication. Real provider login, settlement, vendor-certified barcodes, wallet passes, refunds, and reconciliation are outside this sandbox. These technical boundaries are documented here rather than displayed over the replica UI.

## Troubleshooting

Stop the earlier terminal if ports are occupied. Disable Decline payment if checkout keeps failing. Reset from the operator page if old sessions or inventory are confusing. Rebuild after changes to any site in built mode (`npm run build` builds all five); restart after backend changes. Original Google Fonts use the network, with system-font fallback offline.

The operating guide is SANDBOX.md in the repository root.

## All five sites

`npm run demo` (or `npm run demo:built` after `npm run build`) serves every customer site against one shared set of mock services:

| Port | Site | Folder | Default fan |
|------|------|--------|-------------|
| 4000 | Weverse / BTS | `frontend` | bts_army@gmail.com |
| 4001 | Epik High | `epikhigh` | epikhigh_fan@gmail.com |
| 4002 | David Jin | `davidjin` | funnygirl@gmail.com |
| 4003 | KOOM Live | `koomlive` | fan@example.com |
| 4004 | Jay Park | `jaypark` | jpark_fan@gmail.com |

Each port has its own `/operator` page (member, decline-payment and hold controls act on that site only). Reset clears orders and inventory for all sites. Every site uses the same live seating diagram on step 2C, driven by the event's inventory and synced to the selected seat option (KOOM Live also supports general admission).
