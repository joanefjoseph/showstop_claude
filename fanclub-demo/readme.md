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