import 'dotenv/config';
import { z } from 'zod';
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TICKET_VENDOR_BASE_URL: z.string().url(),
  TICKET_VENDOR_API_KEY: z.string().min(1),
  TICKET_VENDOR_PARTNER_ID: z.string().min(1),
  MEMBERSHIP_BASE_URL: z.string().url(),
  MEMBERSHIP_API_KEY: z.string().min(1),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  SEAT_HOLD_SECONDS: z.coerce.number().int().positive().default(300),
  BARCODE_ROTATION_SECONDS: z.coerce.number().int().positive().default(15),
  MEMBERSHIP_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(60),
});
export type Config = z.infer<typeof envSchema>;
function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }
  return result.data;
}
export const config: Config = loadConfig();
