import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import express from "express";
import type { Server } from "node:http";
import { createServer as createPortProbe } from "node:net";

// Set environment before importing either service: no .env or external credentials needed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testing = process.argv.includes("--test");
const offset = testing ? 1000 : 0;
// Each customer site runs on its own port; `defaultEmail` is the fan signed in on a fresh reset.
const SITES = [
  { dir: "frontend", title: "Weverse/BTS", port: 4000, defaultEmail: "bts_army@gmail.com" },
  { dir: "epikhigh", title: "Epik High", port: 4001, defaultEmail: "epikhigh_fan@gmail.com" },
  { dir: "davidjin", title: "David Jin", port: 4002, defaultEmail: "funnygirl@gmail.com" },
  { dir: "koomlive", title: "KOOM Live", port: 4003, defaultEmail: "fan@example.com" },
  { dir: "jaypark", title: "Jay Park", port: 4004, defaultEmail: "jpark_fan@gmail.com" },
];
// Check ports before resetting SQLite, so a second launch cannot erase a live demo.
for (const candidate of [3001 + offset, 3002 + offset, 3003 + offset, ...(testing ? [] : SITES.map((s) => s.port))]) {
  await new Promise<void>((resolve, reject) => {
    const probe = createPortProbe();
    probe.once("error", () => reject(new Error(`Port ${candidate} is already in use. Stop the earlier sandbox before restarting.`)));
    probe.listen(candidate, "127.0.0.1", () => probe.close(() => resolve()));
  });
}
Object.assign(process.env, {
  NODE_ENV: "development",
  PORT: String(3003 + offset),
  VENDOR_PORT: String(3001 + offset),
  MEMBERSHIP_PORT: String(3002 + offset),
  TICKET_VENDOR_BASE_URL: `http://127.0.0.1:${3001 + offset}/v1`,
  TICKET_VENDOR_API_KEY: "demo-vendor-key",
  TICKET_VENDOR_PARTNER_ID: "fanclub-partner-001",
  MEMBERSHIP_BASE_URL: `http://127.0.0.1:${3002 + offset}/api`,
  MEMBERSHIP_API_KEY: "demo-membership-key",
  BRIDGE_URL: `http://127.0.0.1:${3003 + offset}`,
  MEMBERSHIP_CACHE_TTL_SECONDS: "0",
  DB_PATH: path.join(root, "work", testing ? "test.db" : "sandbox.db"),
  MOCK_LATENCY_MS: "0",
});
const { openDb } = await import("../fanclub-demo/src/db/connection.ts");
const { seedDatabase } = await import("../fanclub-demo/src/db/seed.ts");
const { createMembershipApi } =
  await import("../fanclub-demo/src/mocks/membershipApi.ts");
const { createTicketVendorApi } =
  await import("../fanclub-demo/src/mocks/ticketVendorApi.ts");
const { createApp } = await import("../fanclub-ticketing-bridge/src/app.ts");
const db = openDb();
seedDatabase(db);
// Sales-demo dates are relative to launch; checked-in reference fixtures stay deterministic.
function futureDates() {
  const events = db
    .prepare("SELECT event_id FROM events ORDER BY event_id")
    .all() as { event_id: string }[];
  for (const [i, event] of events.entries())
    db.prepare("UPDATE events SET starts_at = ? WHERE event_id = ?").run(
      new Date(Date.now() + (60 + i * 3) * 86400000).toISOString(),
      event.event_id,
    );
}
if (!testing) futureDates();
const servers: Server[] = [];
async function listen(app: express.Express, listenPort: number) {
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(listenPort, "127.0.0.1", resolve);
    servers.push(server);
    server.on("error", reject);
  });
}
let generation = randomUUID();
const traces: {
  id: string;
  method: string;
  path: string;
  status: number;
  ms: number;
}[] = [];
const vites: { close(): Promise<void> }[] = [];
async function shutdown(code = 0) {
  await Promise.all(vites.map((v) => v.close()));
  await Promise.all(
    servers.map(
      (s) =>
        new Promise<void>((resolve) => {
          s.close(() => resolve());
          s.closeAllConnections();
        }),
    ),
  );
  db.close();
  process.exit(code);
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => void shutdown());
try {
  await listen(createTicketVendorApi(db), 3001 + offset);
  await listen(createMembershipApi(db), 3002 + offset);
  const bridge = express();
  bridge.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      traces.unshift({
        id: res.getHeader("X-Request-Id")?.toString() ?? randomUUID(),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
      });
      traces.splice(30);
    });
    next();
  });
  bridge.use(createApp());
  await listen(bridge, 3003 + offset);
  if (testing) {
    for (const script of ["fanclub-demo/src/e2e.ts", "scripts/regression.ts"]) {
      const code = await new Promise<number>((resolve) => {
        const child = spawn(process.execPath, ["--import", "tsx", script], {
          cwd: root,
          env: process.env,
          stdio: "inherit",
        });
        child.on("error", () => resolve(1));
        child.on("exit", (code) => resolve(code ?? 1));
      });
      if (code) await shutdown(code);
    }
    await shutdown();
  }
  // Every site gets its own origin (port), fan identity, payment scenario and operator page.
  // They share one set of mock providers, one database and one reset.
  const sites = SITES.map((site, index) => ({
    ...site,
    generation: randomUUID(),
    email: site.defaultEmail,
    decline: false,
    index,
  }));
  type SiteState = (typeof sites)[number];
  const resetAll = () => {
    seedDatabase(db);
    futureDates();
    traces.length = 0;
    for (const s of sites) {
      s.generation = randomUUID();
      s.email = s.defaultEmail;
      s.decline = false;
    }
  };
  const scenarioEmails = (s: SiteState) => [
    s.defaultEmail,
    "basic@example.com",
    "expired@example.com",
    "missing@example.com",
  ];
  function createSiteApp(site: SiteState) {
    const app = express();
    app.get("/operator", (_req, res) =>
      res.sendFile(path.join(root, "scripts/operator.html")),
    );
    app.use("/sandbox", express.json(), (req, res, next) => {
      res.setHeader("Cache-Control", "no-store");
      // Controls exist only in this loopback sandbox. Reject cross-origin mutations.
      if (
        req.method !== "GET" &&
        (req.get("X-Sandbox-Control") !== "1" ||
          (req.get("origin") &&
            req.get("origin") !== `http://127.0.0.1:${site.port}` &&
            req.get("origin") !== `http://localhost:${site.port}`))
      ) {
        res.status(403).json({ error: "Use the local presenter controls" });
        return;
      }
      next();
    });
    app.get("/sandbox/config", (_req, res) =>
      res.json({ generation: site.generation, email: site.email }),
    );
    app.post("/sandbox/scenario", (req, res) => {
      if (req.body.email !== undefined) {
        if (!scenarioEmails(site).includes(req.body.email)) {
          res.sendStatus(400);
          return;
        }
        site.email = req.body.email;
        site.generation = randomUUID();
      }
      if (typeof req.body.decline === "boolean") site.decline = req.body.decline;
      res.json({ generation: site.generation, email: site.email, decline: site.decline });
    });
    app.get("/sandbox/state", async (_req, res) => {
      const probes = await Promise.allSettled([
        fetch(`${process.env.MEMBERSHIP_BASE_URL}/members/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer demo-membership-key",
          },
          body: JSON.stringify({ email: "fan@example.com" }),
          signal: AbortSignal.timeout(1500),
        }),
        fetch(`${process.env.TICKET_VENDOR_BASE_URL}/events/metlife-stadium`, {
          headers: {
            "X-Api-Key": "demo-vendor-key",
            "X-Partner-Id": "fanclub-partner-001",
          },
          signal: AbortSignal.timeout(1500),
        }),
        fetch(`${process.env.BRIDGE_URL}/health`, {
          signal: AbortSignal.timeout(1500),
        }),
      ]);
      res.json({
        generation: site.generation,
        email: site.email,
        decline: site.decline,
        site: { name: site.title, defaultEmail: site.defaultEmail },
        members: scenarioEmails(site),
        carts: db
          .prepare(
            "SELECT cart_id, membership_id, status FROM carts WHERE status IN ('OPEN','BILLING_ATTACHED')",
          )
          .all(),
        services: probes.map((p, i) => ({
          name: ["Membership API", "Ticket vendor API", "Show Stop bridge"][i],
          ok: p.status === "fulfilled" && p.value.ok,
        })),
        traces: traces.filter((t) => t.path !== "/health").slice(0, 12),
        orders: (
          db
            .prepare(
              "SELECT COUNT(*) AS n FROM orders WHERE order_id NOT LIKE 'ord_seed%'",
            )
            .get() as { n: number }
        ).n,
      });
    });
    app.post("/sandbox/reset", (_req, res) => {
      resetAll();
      res.json({ generation: site.generation });
    });
    app.post("/sandbox/expire", (req, res) => {
      if (typeof req.body?.cartId !== "string") {
        res.status(400).json({ error: "cartId required" });
        return;
      }
      db.prepare(
        "UPDATE carts SET hold_expires_at = ? WHERE cart_id = ? AND status IN ('OPEN','BILLING_ATTACHED')",
      ).run(new Date(Date.now() - 1000).toISOString(), req.body.cartId);
      res.json({ expired: true });
    });
    // Same-origin bridge proxy also works with the production frontend build.
    app.use(
      "/bridge",
      express.raw({ type: () => true, limit: "64kb" }),
      async (req, res) => {
        try {
          const headers: Record<string, string> = {};
          for (const key of ["content-type", "x-membership-id", "idempotency-key"])
            if (req.get(key)) headers[key] = req.get(key)!;
          if (
            site.decline &&
            req.method === "PUT" &&
            req.path.endsWith("/billing") &&
            Buffer.isBuffer(req.body)
          ) {
            try {
              const billing = JSON.parse(req.body.toString());
              billing.payment.paymentToken = "tok_decline_demo";
              req.body = Buffer.from(JSON.stringify(billing));
            } catch {
              /* normal validation handles malformed input */
            }
          }
          const upstream = await fetch(`${process.env.BRIDGE_URL}${req.url}`, {
            method: req.method,
            headers,
            body:
              Buffer.isBuffer(req.body) && req.body.length
                ? new Uint8Array(req.body)
                : undefined,
            signal: AbortSignal.timeout(12000),
          });
          res
            .status(upstream.status)
            .type("json")
            .set("Cache-Control", "no-store")
            .send(Buffer.from(await upstream.arrayBuffer()));
        } catch {
          res.status(502).json({
            error: {
              code: "BRIDGE_UNREACHABLE",
              message: "The bridge is unavailable. Restart the sandbox and retry.",
            },
          });
        }
      },
    );
    return app;
  }
  for (const site of sites) {
    const app = createSiteApp(site);
    if (process.argv.includes("--built"))
      app.use(express.static(path.join(root, site.dir, "dist")));
    else {
      const { createServer } = await import("vite");
      const dev = await createServer({
        root: path.join(root, site.dir),
        // Each dev server needs its own HMR socket port.
        server: { middlewareMode: true, hmr: { port: 24700 + site.index } },
        appType: "spa",
      });
      vites.push(dev);
      app.use(dev.middlewares);
    }
    await listen(app, site.port);
  }
  console.log(
    `\nShow Stop sandbox ready:\n${sites
      .map((s) => `  ${s.title.padEnd(12)} → http://127.0.0.1:${s.port}/#/2a   (operator: /operator)`)
      .join("\n")}\nSynthetic data. No real payments. Ctrl+C stops all services.\n`,
  );
} catch (error) {
  console.error(
    "Sandbox could not start. Check that ports 3001–3003 and 4000–4004 are free.",
    error,
  );
  await shutdown(1);
}
