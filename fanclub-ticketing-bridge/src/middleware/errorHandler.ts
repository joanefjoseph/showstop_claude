import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, UpstreamError } from '../errors.ts';
import { config } from '../config.ts';
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}`));
};
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const requestId = res.locals.requestId as string | undefined;
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: { code: err.code, message: err.message, requestId },
    };
    if (err.details !== undefined) (body.error as Record<string, unknown>).details = err.details;
    if (err instanceof UpstreamError) (body.error as Record<string, unknown>).upstream = err.upstream;
    return res.status(err.status).json(body);
  }
  // Body-parser JSON syntax errors
  if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON', requestId } });
  }
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ ts: new Date().toISOString(), requestId, level: 'error', err: String(err), stack: (err as Error)?.stack }));
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: config.NODE_ENV === 'production' ? 'Unexpected error' : String((err as Error)?.message ?? err),
      requestId,
    },
  });
};
