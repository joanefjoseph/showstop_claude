import { randomBytes } from 'node:crypto';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { demoConfig } from '../config';
import type { Money } from '../bridgeContracts';
/** Error with an HTTP status. The body uses `{ error, message }`, which the bridge's mapError reads. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export const toMoney = (cents: number, currency: string): Money => ({ amount: cents / 100, currency });
export const newId = (prefix: string) => `${prefix}_${randomBytes(5).toString('hex')}`;
export const requestLog = (name: string): RequestHandler => (req, res, next) => {
  const start = Date.now();
  res.on('finish', () =>
    console.log(`[${name}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`),
  );
  next();
};
export const simulatedLatency: RequestHandler = (_req, _res, next) => {
  if (demoConfig.latencyMs > 0) setTimeout(next, demoConfig.latencyMs);
  else next();
};
export const notFound: RequestHandler = (req, _res, next) =>
  next(new HttpError(404, `No mock route for ${req.method} ${req.path}`, 'ROUTE_NOT_FOUND'));
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message, ...err.extra });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'MALFORMED_JSON', message: 'Request body is not valid JSON' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'INTERNAL', message: String(err?.message ?? err) });
};