import express from 'express';
import type Database from 'better-sqlite3';
import { demoConfig } from '../config.ts';
import type {
  MembershipRecord,
  MembershipStatus,
  MembershipTier,
  MembershipVerifyRequest,
  MembershipVerifyResponse,
} from '../bridgeContracts.ts';
import { HttpError, errorHandler, notFound, requestLog, simulatedLatency } from './common.ts';
interface MemberRow {
  membership_id: string;
  email: string;
  status: MembershipStatus;
  tier_id: string;
  member_since: string;
  renews_at: string | null;
  display_name: string | null;
  tier_name: string;
  level: number;
  max_tickets_per_order: number | null;
  presale_access: number | null;
}
function toRecord(r: MemberRow): MembershipRecord {
  const tier: MembershipTier = { tierId: r.tier_id, name: r.tier_name, level: r.level };
  if (r.max_tickets_per_order !== null) tier.maxTicketsPerOrder = r.max_tickets_per_order;
  if (r.presale_access !== null) tier.presaleAccess = r.presale_access === 1;
  const record: MembershipRecord = {
    membershipId: r.membership_id,
    email: r.email,
    status: r.status,
    tier,
    memberSince: r.member_since,
  };
  if (r.renews_at) record.renewsAt = r.renews_at;
  if (r.display_name) record.displayName = r.display_name;
  return record;
}
/** Mock of the event organizer's fan-membership API (base path /api). */
export function createMembershipApi(db: Database.Database) {
  const base = `SELECT m.*, t.name AS tier_name, t.level, t.max_tickets_per_order, t.presale_access
                FROM members m JOIN membership_tiers t ON t.tier_id = m.tier_id`;
  const byEmail = db.prepare(`${base} WHERE m.email = ?`); // column is COLLATE NOCASE
  const byId = db.prepare(`${base} WHERE m.membership_id = ?`);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use(requestLog('membership'));
  app.use(simulatedLatency);
  const api = express.Router();
  // Bearer auth, as sent by MembershipClient
  api.use((req, _res, next) => {
    if (req.header('authorization') !== `Bearer ${demoConfig.membershipApiKey}`) {
      return next(new HttpError(401, 'Invalid or missing API key', 'UNAUTHORIZED'));
    }
    next();
  });
  /** POST /api/members/verify: always 200; `{ found: false }` when there is no match. */
  api.post('/members/verify', (req, res) => {
    const email = (req.body as Partial<MembershipVerifyRequest> | undefined)?.email;
    if (typeof email !== 'string' || !email.includes('@')) {
      throw new HttpError(400, 'A valid email is required', 'INVALID_EMAIL');
    }
    const row = byEmail.get(email.trim()) as MemberRow | undefined;
    const body: MembershipVerifyResponse = row ? { found: true, member: toRecord(row) } : { found: false };
    res.json(body);
  });
  /** GET /api/members/:membershipId */
  api.get('/members/:membershipId', (req, res) => {
    const row = byId.get(req.params.membershipId) as MemberRow | undefined;
    if (!row) throw new HttpError(404, `Member '${req.params.membershipId}' not found`, 'MEMBER_NOT_FOUND');
    res.json(toRecord(row));
  });
  app.use('/api', api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
