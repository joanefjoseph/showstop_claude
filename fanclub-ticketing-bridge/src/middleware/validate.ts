import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { badRequest } from '../errors.ts';
type Part = 'body' | 'params' | 'query';
/** Validates and replaces `req[part]` with the parsed (typed, stripped) value. */
export function validate(part: Part, schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(
        badRequest(`Invalid request ${part}`, result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }))),
      );
    }
    (req as unknown as Record<Part, unknown>)[part] = result.data;
    next();
  };
}
