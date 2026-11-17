import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { createServer } from "node:http";
import { HttpClient } from "../fanclub-ticketing-bridge/src/clients/httpClient.ts";
const base = process.env.BRIDGE_URL!;
const db = new Database(process.env.DB_PATH!);
let passed = 0;
async function call<T = any>(
  method: string,
  path: string,
  body?: unknown,
  member?: string,
  key?: string,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(member ? { "X-Membership-Id": member } : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: (await response.json()) as T };
}
function check(name: string, condition: unknown) {
  assert.ok(condition, name);
  passed++;
  console.log(`  ✔ ${name}`);
}
const billing = {
  customer: {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "fan@example.com",
  },
  address: {
    line1: "1 Demo Way",
    city: "Austin",
    region: "TX",
    postalCode: "78701",
    country: "US",
  },
  payment: { paymentToken: "tok_demo_wallet", method: "WALLET" },
};
try {
  console.log(
    "\nSandbox regression: ownership, concurrency, expiry, recovery, GA",
  );
  const inventory = await call("GET", "/events/metlife-stadium/availability");
  const seats = inventory.body.sections
    .flatMap((s: any) => s.seats)
    .map((s: any) => s.seatId);
  const body = { eventId: "metlife-stadium", seatIds: [seats[0]] };
  const raced = await Promise.all([
    call("POST", "/carts/lock", body, "mem_9f3"),
    call("POST", "/carts/lock", body, "mem_p01"),
  ]);
  check(
    "simultaneous seat requests have exactly one winner",
    raced.filter((x) => x.status === 201).length === 1 &&
      raced.filter((x) => x.status === 409).length === 1,
  );
  const winner = raced.find((x) => x.status === 201)!.body;
  const owner = winner.membershipId;
  const stranger = owner === "mem_9f3" ? "mem_p01" : "mem_9f3";
  check(
    "billing requires membership",
    (await call("PUT", `/carts/${winner.cartId}/billing`, billing)).status ===
      401,
  );
  check(
    "another member cannot bill a cart",
    (await call("PUT", `/carts/${winner.cartId}/billing`, billing, stranger))
      .status === 404,
  );
  check(
    "another member cannot commit a cart",
    (await call("PUT", `/carts/${winner.cartId}/commit`, undefined, stranger))
      .status === 404,
  );
  check(
    "Basic member cannot buy presale seats",
    (
      await call(
        "POST",
        "/carts/lock",
        { ...body, seatIds: [seats[1]] },
        "mem_b07",
      )
    ).status === 403,
  );
  check(
    "owner can attach billing",
    (await call("PUT", `/carts/${winner.cartId}/billing`, billing, owner))
      .status === 200,
  );
  const commit = await call(
    "PUT",
    `/carts/${winner.cartId}/commit`,
    undefined,
    owner,
    "regression:" + winner.cartId,
  );
  check(
    "owner confirms exactly one ticket",
    commit.status === 200 && commit.body.tickets.length === 1,
  );
  const replay = await call(
    "PUT",
    `/carts/${winner.cartId}/commit`,
    undefined,
    owner,
    "regression:" + winner.cartId,
  );
  check(
    "lost-response retry recovers same order",
    replay.body.orderId === commit.body.orderId,
  );
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM orders WHERE cart_id = ?")
    .get(winner.cartId) as { n: number };
  check("retry does not create a second order", count.n === 1);
  const ticket = await call(
    "GET",
    `/tickets/${commit.body.tickets[0].ticketId}`,
    undefined,
    owner,
  );
  check(
    "ticket includes a current barcode but no secret",
    ticket.body.barcode.value &&
      Date.parse(ticket.body.barcode.validUntil) > Date.now() &&
      !JSON.stringify(ticket.body).includes("secret"),
  );
  check(
    "another member cannot read the ticket",
    (
      await call(
        "GET",
        `/tickets/${commit.body.tickets[0].ticketId}`,
        undefined,
        stranger,
      )
    ).status === 404,
  );
  const expiring = await call(
    "POST",
    "/carts/lock",
    { ...body, seatIds: [seats[2]] },
    owner,
  );
  check("second hold created", expiring.status === 201);
  db.prepare("UPDATE carts SET hold_expires_at = ? WHERE cart_id = ?").run(
    new Date(Date.now() - 1000).toISOString(),
    expiring.body.cartId,
  );
  check(
    "expired hold cannot be billed",
    (
      await call(
        "PUT",
        `/carts/${expiring.body.cartId}/billing`,
        billing,
        owner,
      )
    ).status === 410,
  );
  const restored = await call("GET", "/events/metlife-stadium/availability");
  check(
    "expired seat returns to inventory",
    restored.body.sections
      .flatMap((s: any) => s.seats)
      .some((s: any) => s.seatId === seats[2]),
  );
  const newHold = await call(
    "POST",
    "/carts/lock",
    { ...body, seatIds: [seats[2]] },
    owner,
  );
  check("expired seat can be reserved again", newHold.status === 201);
  await call("PUT", `/carts/${newHold.body.cartId}/billing`, billing, owner);
  check(
    "idempotency key cannot be reused for another cart",
    (
      await call(
        "PUT",
        `/carts/${newHold.body.cartId}/commit`,
        undefined,
        owner,
        "regression:" + winner.cartId,
      )
    ).status === 409,
  );
  const sold = await call("GET", "/events/evt_999/availability");
  check(
    "sold-out fixture returns zero availability",
    sold.status === 200 && sold.body.totals.available === 0,
  );
  const ga = db
    .prepare(
      "SELECT event_id, section FROM seats WHERE general_admission = 1 GROUP BY event_id, section HAVING COUNT(*) > 5",
    )
    .all() as { event_id: string; section: string }[];
  const pureGa = ga.find(
    (g) =>
      (
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM seats WHERE event_id = ? AND general_admission = 0",
          )
          .get(g.event_id) as { n: number }
      ).n === 0,
  )!;
  check(
    "GA quantity hold still works",
    (
      await call(
        "POST",
        "/carts/lock",
        { eventId: pureGa.event_id, section: pureGa.section, quantity: 2 },
        owner,
      )
    ).status === 201,
  );
  const invalid = await fetch(base + "/carts/lock", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Membership-Id": owner },
    body: "{",
    signal: AbortSignal.timeout(5000),
  });
  check("malformed JSON yields 400", invalid.status === 400);
  const upstream = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    if (req.url === "/slow") {
      res.flushHeaders();
      res.write("{");
    } else res.end("not-json");
  });
  await new Promise<void>((resolve) =>
    upstream.listen(0, "127.0.0.1", resolve),
  );
  try {
    const address = upstream.address() as { port: number };
    const client = new HttpClient({
      name: "ticket-vendor",
      baseUrl: `http://127.0.0.1:${address.port}`,
      timeoutMs: 250,
    });
    await assert.rejects(
      client.get("/slow"),
      (e: any) => e.code === "UPSTREAM_TIMEOUT",
    );
    check("timeout covers a stalled response body", true);
    await assert.rejects(
      client.get("/invalid"),
      (e: any) => e.code === "UPSTREAM_INVALID_RESPONSE",
    );
    check("invalid successful upstream JSON becomes a controlled error", true);
  } finally {
    upstream.closeAllConnections();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  }
  console.log(`\n${passed} regression checks passed`);
} finally {
  db.close();
}
