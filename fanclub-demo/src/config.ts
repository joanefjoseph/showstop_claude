import 'dotenv/config';
import path from 'node:path';
const num = (v: string | undefined, fallback: number) => (v ? Number(v) : fallback);
export const demoConfig = {
  vendorPort: num(process.env.VENDOR_PORT, 4001),
  membershipPort: num(process.env.MEMBERSHIP_PORT, 4002),
  vendorApiKey: process.env.VENDOR_API_KEY ?? 'demo-vendor-key',
  vendorPartnerId: process.env.VENDOR_PARTNER_ID ?? 'fanclub-partner-001',
  membershipApiKey: process.env.MEMBERSHIP_API_KEY ?? 'demo-membership-key',
  dbPath: path.resolve(process.env.DB_PATH ?? './data/demo.db'),
  latencyMs: num(process.env.MOCK_LATENCY_MS, 0),
  bridgeUrl: (process.env.BRIDGE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
};