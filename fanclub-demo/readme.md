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