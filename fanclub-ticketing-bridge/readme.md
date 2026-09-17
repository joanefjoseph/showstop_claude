# Running It

```
cp .env.example .env   # fill in real URLs and keys
npm install
npm run dev            # or: npm run build && npm start
```

# End-to-End Purchase Flow

## 1. What's available?
```
curl localhost:3000/events/evt_123/availability
```
## 2. Verify the fan → get membershipId
```
curl -X POST localhost:3000/membership/verify \
  -H 'Content-Type: application/json' -d '{"email":"fan@example.com"}'
# → { "verified": true, "membershipId": "mem_9f3", "tier": {"name":"Gold",...}, "eligibleToPurchase": true }
```
## 3. Lock seats for 5 minutes (membership header REQUIRED)
```
curl -X POST localhost:3000/carts/lock \
  -H 'Content-Type: application/json' -H 'X-Membership-Id: mem_9f3' \
  -d '{"eventId":"evt_123","seatIds":["s_101_A_7","s_101_A_8"]}'
# → { "cartId": "cart_abc", "holdExpiresAt": "...", "holdSecondsRemaining": 299, ... }
```
## 4. Attach billing (tokenised payment only)
```
curl -X PUT localhost:3000/carts/cart_abc/billing \
  -H 'Content-Type: application/json' \
  -d '{"customer":{"firstName":"Ada","lastName":"Lovelace","email":"fan@example.com"},
       "address":{"line1":"1 Main St","city":"Austin","region":"TX","postalCode":"78701","country":"US"},
       "payment":{"paymentToken":"tok_visa_4242","method":"CARD"}}'
```
## 5. Commit → order + ticket IDs
```
curl -X PUT localhost:3000/carts/cart_abc/commit -H 
'Idempotency-Key: order-attempt-1'
# → { "orderId":"ord_77", "tickets":[{"ticketId":"tkt_1","mobileTicketUrl":"/tickets/tkt_1"},...] }
```
## 6. Mobile ticket with rotating barcode (poll again after `nextRotationAt`)
```
curl localhost:3000/tickets/tkt_1 -H 'X-Membership-Id: mem_9f3'
# → { "barcode": { "format":"PDF417", "value":"tkt_1.113245678.48213377", "rotating":true,
#                  "rotatesEverySeconds":15, "nextRotationAt":"..." }, ... }
```

# Design Notes

* **Separation of concerns** — `clients/` know HTTP and the upstream wire formats; `services/` hold the business rules (tier seat limits, hold expiry checks, barcode rotation); `routes/` only validate and translate to HTTP.
* **Membership enforcement** — requireMembership re-validates `X-Membership-Id` against the membership API (with a short TTL cache) so a stale/suspended ID can't lock seats or retrieve tickets, and the ID is forwarded to the vendor so the vendor can scope the ticket lookup to its purchaser.
* **5-minute hold** — driven by `SEAT_HOLD_SECONDS (300)` sent as `holdDurationSeconds`; responses echo `holdExpiresAt`/`holdSecondsRemaining` so the client can render a countdown. Expired holds surface as `410 HOLD_EXPIRED`.
* **Idempotency** — cart creation and commit send `Idempotency-Key` headers so retried network calls don't double-hold or double-charge.
* **PCI** — only a payment _token_ is accepted; the Zod schema rejects anything that looks like raw card data structure, and request bodies are capped at 64 KB.
* **Error mapping** — upstream failures are normalised into `{ error: { code, message, upstream, requestId } }` with sensible status codes (`409` seat already taken, `410` hold expired, `429` rate limited, `502`/`504` vendor down/slow).
* **Adapting to a real vendor** — the only files you should need to touch to match Ticketmaster/AXS/etc. are `types/vendor.ts`, `clients/ticketVendorClient.ts` (paths/headers) and, if their barcode scheme differs, services/`rotatingBarcode.ts`.