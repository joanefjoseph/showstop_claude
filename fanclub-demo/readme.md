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
