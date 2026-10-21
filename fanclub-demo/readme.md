# Running It

## Terminal 1: demo DB + mock upstreams (auto-seeds on first start)
cd fanclub-demo
cp .env.example .env
npm install
npm start              # or: npm run start:fresh  (wipe and reseed)
## Terminal 2: the bridge
cd fanclub-ticketing-bridge
npm install
npm run dev
## Terminal 3: drive all 6 routes
cd fanclub-demo
npm run e2e
npm run typecheck      # optional: verifies mock responses match bridge contracts

## Codebase Architecture

`fanclub-demo` is the local integration environment for the bridge. It runs two mock upstream APIs backed by the same seeded SQLite database, plus a small browser console and an end-to-end purchase-flow runner.

```text
fanclub-demo/
|--- package.json                  # Server, reset, console, e2e, and typecheck scripts
|--- package-lock.json
|--- tsconfig.json                 # Strict TypeScript / NodeNext configuration
|--- .env.example                  # Mock ports/keys, database path, latency, bridge URL, console port
|--- public/
|   |--- index.html                # Browser API console
|   |--- styles.css
|--- data/
|   |--- demo.db                   # SQLite database created and seeded by the app
|--- src/
    |--- server.ts                 # Opens/seeds the DB and starts both mock APIs
    |--- config.ts                 # Loads mock and console settings
    |--- bridgeContracts.ts        # Re-exports bridge API/vendor/membership types and barcode helper
    |--- e2e.ts                    # Exercises the six bridge API operations
    |--- mocks/
    |   |--- common.ts             # Shared mock logging, latency, errors, and response helpers
    |   |--- membershipApi.ts      # Mock membership verification and lookup API
    |   |--- ticketVendorApi.ts    # Mock vendor availability, cart, order, and ticket API
    |--- db/
    |   |--- connection.ts         # SQLite connection and schema loading
    |   |--- schema.sql            # Membership, event inventory, cart, order, and ticket tables
    |   |--- seed.ts               # Creates the base demo records
    |   |--- tourSeed.ts            # Seeds tour venues, events, price levels, and seats
    |--- console/
        |--- server.ts             # Serves the console and proxies /bridge to the configured bridge
```

The main server (`src/server.ts`) opens the database, applies initial seed data when needed (or when started with `--reset`), and starts the mock Membership API and Ticket Vendor Partner API on their configured ports. The APIs use the shared schema in `src/db/schema.sql`; `src/db/tourSeed.ts` adds the tour events and inventory consumed by the frontends and bridge.

`src/bridgeContracts.ts` imports the shared API types and rotating-barcode helper from `fanclub-ticketing-bridge`, keeping the mock responses aligned with the bridge's contracts. `src/e2e.ts` drives the bridge's end-to-end purchase flow. The optional console server serves `public/` and provides a same-origin `/bridge` proxy, allowing the browser UI to call a running bridge without cross-origin requests.

# Quick Verification
```
cd fanclub-demo
rm -rf node_modules package-lock.json && npm install
npm run typecheck      # catches missing .js extensions and config mismatches with the bridge
npm run db:reset       # exercises reset.ts and the import.meta.url schema path
npm start
npm run e2e            # with the bridge running via its tsx dev script
```

## PowerShell quick verification
Run these commands from the workspace root. The reinstall commands apply to `fanclub-demo` only.
```
Set-Location .\fanclub-demo
Remove-Item -Recurse -Force .\node_modules, .\package-lock.json -ErrorAction SilentlyContinue
npm install
npm run typecheck
npm run db:reset
npm start
```
With the demo server running in another terminal and the bridge running, return to the demo folder and run:
```
Set-Location .\fanclub-demo
npm run e2e
```

To recreate a clean demo database, first stop the demo server with `Ctrl+C`. The following backs up the database files if present, removes them, and lets `npm start` seed a fresh database:
```
Set-Location .\fanclub-demo
if (Test-Path .\data\demo.db) { Copy-Item .\data\demo.db .\data\demo.db.backup }
Remove-Item .\data\demo.db, .\data\demo.db-shm, .\data\demo.db-wal -Force -ErrorAction SilentlyContinue
npm start
```

# Interactive web UI

## Terminal 1: mock upstreams + demo DB
cd fanclub-demo && npm start
## Terminal 2: the bridge
cd fanclub-ticketing-bridge && npm run dev
## Terminal 3: the console
cd fanclub-demo && npm run console
