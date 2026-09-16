import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.ts';
import { requireMembership, getMember } from '../middleware/requireMembership.ts';
import { getMobileTicket } from '../services/ticketService.ts';
export const ticketsRouter = Router();
const params = z.object({ ticketId: z.string().min(1).max(128) });
/** 6. GET /tickets/:ticketId  (requires X-Membership-Id) */
ticketsRouter.get('/:ticketId', requireMembership, validate('params', params), async (req, res, next) => {
  try {
    const ticket = await getMobileTicket(req.params.ticketId, getMember(res).membershipId);
    res.setHeader('Cache-Control', 'no-store, private');
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});
