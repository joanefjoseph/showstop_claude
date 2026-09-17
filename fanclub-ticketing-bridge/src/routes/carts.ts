import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.ts';
import { requireMembership, getMember } from '../middleware/requireMembership.ts';
import { attachBilling, commitCart, lockSeats } from '../services/cartService.ts';
import type { VendorBillingRequest } from '../types/vendor.ts';
export const cartsRouter = Router();
const cartIdParams = z.object({ cartId: z.string().min(1).max(128) });
const lockBody = z.object({
  eventId: z.string().min(1).max(128),
  seatIds: z.array(z.string().min(1)).min(1).max(50),
});
const billingBody = z.object({
  customer: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(5).max(30).optional(),
  }),
  address: z.object({
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(1).max(100),
    region: z.string().min(1).max(100),
    postalCode: z.string().min(1).max(20),
    country: z.string().length(2), // ISO 3166-1 alpha-2
  }),
  payment: z.object({
    // Only a tokenised instrument is accepted — raw card numbers must never hit this service.
    paymentToken: z.string().min(8).max(512),
    method: z.enum(['CARD', 'WALLET']).default('CARD'),
  }),
});
/** 3. POST /carts/lock  (requires X-Membership-Id) */
cartsRouter.post('/lock', requireMembership, validate('body', lockBody), async (req, res, next) => {
  try {
    const result = await lockSeats(getMember(res), req.body as z.infer<typeof lockBody>);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});
/** 4. PUT /carts/:cartId/billing */
cartsRouter.put('/:cartId/billing', validate('params', cartIdParams), validate('body', billingBody), async (req, res, next) => {
  try {
    const billing: VendorBillingRequest = { ...(req.body as z.infer<typeof billingBody>), deliveryMethod: 'MOBILE' };
    res.json(await attachBilling(req.params.cartId, billing));
  } catch (err) {
    next(err);
  }
});
/** 5. PUT /carts/:cartId/commit */
cartsRouter.put('/:cartId/commit', validate('params', cartIdParams), async (req, res, next) => {
  try {
    const idempotencyKey = req.header('idempotency-key') ?? undefined;
    res.json(await commitCart(req.params.cartId, idempotencyKey));
  } catch (err) {
    next(err);
  }
});
