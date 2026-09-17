import { createHmac } from 'node:crypto';
export interface RotatingBarcode {
  value: string;
  counter: number;
  validUntil: Date;
  nextRotationAt: Date;
}
/**
 * Time-based rotating barcode (TOTP-style).
 *
 * value = <ticketId>.<counter>.<8-digit HMAC-SHA256(secret, ticketId:counter)>
 *
 * The vendor's entry scanners validate the same construction server-side,
 * so a screenshot of the barcode becomes useless after one interval.
 * Replace `derive()` with the vendor's documented algorithm if it differs.
 */
export function generateRotatingBarcode(
  secret: string,
  ticketId: string,
  intervalSeconds: number,
  now: number = Date.now(),
): RotatingBarcode {
  const counter = Math.floor(now / 1000 / intervalSeconds);
  const otp = derive(secret, `${ticketId}:${counter}`);
  const nextRotationAt = new Date((counter + 1) * intervalSeconds * 1000);
  return {
    value: `${ticketId}.${counter}.${otp}`,
    counter,
    validUntil: nextRotationAt,
    nextRotationAt,
  };
}
function derive(secret: string, message: string): string {
  const digest = createHmac('sha256', secret).update(message).digest();
  // Dynamic truncation à la RFC 4226
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_0000_0000).padStart(8, '0');
}
