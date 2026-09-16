import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.ts';
import { getEventAvailability } from '../services/availabilityService.ts';
export const eventsRouter = Router();
const params = z.object({ eventId: z.string().min(1).max(128) });
/** 1. GET /events/:eventId/availability */
eventsRouter.get('/:eventId/availability', validate('params', params), async (req, res, next) => {
  try {
    const data = await getEventAvailability(req.params.eventId);
    res.setHeader('Cache-Control', 'no-store'); // inventory is live
    res.json(data);
  } catch (err) {
    next(err);
  }
});
