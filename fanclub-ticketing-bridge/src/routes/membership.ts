import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.ts';
import { verifyByEmail } from '../services/membershipService.ts';
export const membershipRouter = Router();
const body = z.object({ email: z.string().email().max(254) });
/** 2. POST /membership/verify */
membershipRouter.post('/verify', validate('body', body), async (req, res, next) => {
  try {
    const result = await verifyByEmail((req.body as z.infer<typeof body>).email);
    res.status(result.verified ? 200 : 404).json(result);
  } catch (err) {
    next(err);
  }
});
