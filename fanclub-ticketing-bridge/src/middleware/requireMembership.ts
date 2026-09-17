import type { RequestHandler } from 'express';
import { AppError } from '../errors.ts';
import { requireActiveMembership } from '../services/membershipService.ts';
import type { MembershipRecord } from '../types/membership.ts';
export const MEMBERSHIP_HEADER = 'x-membership-id';
/**
 * Requires an `X-Membership-Id` header (value obtained from POST /membership/verify),
 * re-validates it against the membership API and stores it on res.locals.member.
 */
export const requireMembership: RequestHandler = async (req, res, next) => {
  const raw = req.header(MEMBERSHIP_HEADER);
  if (!raw || !raw.trim()) {
    return next(new AppError(401, 'MEMBERSHIP_REQUIRED',
      `Missing required header ${MEMBERSHIP_HEADER}. Call POST /membership/verify first.`));
  }
  try {
    res.locals.member = await requireActiveMembership(raw.trim());
    next();
  } catch (err) {
    if (err instanceof AppError && err.status === 404) {
      return next(new AppError(401, 'MEMBERSHIP_INVALID', 'Unknown membership ID'));
    }
    next(err);
  }
};
export function getMember(res: { locals: Record<string, unknown> }): MembershipRecord {
  return res.locals.member as MembershipRecord;
}
