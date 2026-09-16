import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = req.header('x-request-id') ?? randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(ms),
    }));
  });
  next();
};
