export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'PENDING';
export interface MembershipTier {
  tierId: string;
  name: string;          // e.g. "Gold"
  level: number;         // numeric rank, higher = better
  maxTicketsPerOrder?: number;
  presaleAccess?: boolean;
}
export interface MembershipRecord {
  membershipId: string;
  email: string;
  status: MembershipStatus;
  tier: MembershipTier;
  memberSince: string;
  renewsAt?: string;
  displayName?: string;
}
export interface MembershipVerifyRequest {
  email: string;
}
/** The membership API returns either a record or `{ found: false }`. */
export type MembershipVerifyResponse =
  | { found: true; member: MembershipRecord }
  | { found: false };
