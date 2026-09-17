import { config } from '../config.ts';
import { membershipClient } from '../clients/membershipClient.ts';
import { AppError } from '../errors.ts';
import type { MembershipRecord } from '../types/membership.ts';
import type { MembershipVerificationResponse } from '../types/api.ts';
// Tiny TTL cache so every seat-lock / ticket fetch doesn't round-trip to the membership API.
const cache = new Map<string, { record: MembershipRecord; expiresAt: number }>();
export async function verifyByEmail(email: string): Promise<MembershipVerificationResponse> {
  const res = await membershipClient.verifyByEmail(email.trim().toLowerCase());
  if (!res.found) {
    return { verified: false, eligibleToPurchase: false, reason: 'No membership found for this email' };
  }
  const m = res.member;
  cache.set(m.membershipId, { record: m, expiresAt: Date.now() + config.MEMBERSHIP_CACHE_TTL_SECONDS * 1000 });
  const eligible = m.status === 'ACTIVE';
  return {
    verified: true,
    membershipId: m.membershipId,
    status: m.status,
    tier: m.tier,
    memberSince: m.memberSince,
    renewsAt: m.renewsAt,
    eligibleToPurchase: eligible,
    reason: eligible ? undefined : `Membership is ${m.status.toLowerCase()}`,
  };
}
export async function getMembership(membershipId: string): Promise<MembershipRecord> {
  const hit = cache.get(membershipId);
  if (hit && hit.expiresAt > Date.now()) return hit.record;
  const record = await membershipClient.getById(membershipId);
  cache.set(membershipId, { record, expiresAt: Date.now() + config.MEMBERSHIP_CACHE_TTL_SECONDS * 1000 });
  return record;
}
/** Resolves a membership and throws 403 unless it is ACTIVE. */
export async function requireActiveMembership(membershipId: string): Promise<MembershipRecord> {
  const record = await getMembership(membershipId);
  if (record.status !== 'ACTIVE') {
    throw new AppError(403, 'MEMBERSHIP_INACTIVE',
      `Membership ${membershipId} is ${record.status.toLowerCase()} and cannot purchase tickets`);
  }
  return record;
}
