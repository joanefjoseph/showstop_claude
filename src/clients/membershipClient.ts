import { config } from '../config.ts';
import { HttpClient } from './httpClient.ts';
import type { MembershipRecord, MembershipVerifyResponse } from '../types/membership.ts';
export class MembershipClient {
  private readonly http: HttpClient;
  constructor() {
    this.http = new HttpClient({
      name: 'membership',
      baseUrl: config.MEMBERSHIP_BASE_URL,
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      defaultHeaders: { Authorization: `Bearer ${config.MEMBERSHIP_API_KEY}` },
    });
  }
  /** 2. Look a member up by email address. */
  verifyByEmail(email: string): Promise<MembershipVerifyResponse> {
    return this.http.post('/members/verify', { body: { email } });
  }
  /** Used to re-validate an X-Membership-Id header before locking seats / showing tickets. */
  getById(membershipId: string): Promise<MembershipRecord> {
    return this.http.get(`/members/${encodeURIComponent(membershipId)}`);
  }
}
export const membershipClient = new MembershipClient();
