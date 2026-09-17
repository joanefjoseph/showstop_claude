import express from 'express';
import { requestLogger } from './middleware/requestLogger.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import { eventsRouter } from './routes/events.ts';
import { membershipRouter } from './routes/membership.ts';
import { cartsRouter } from './routes/carts.ts';
import { ticketsRouter } from './routes/tickets.ts';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(express.json({ limit: '64kb' }));
  app.use(requestLogger);
  app.get('/health', (_req, res) => res.json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) }));
  app.use('/events', eventsRouter);          // 1. GET  /events/:eventId/availability
  app.use('/membership', membershipRouter);  // 2. POST /membership/verify
  app.use('/carts', cartsRouter);            // 3. POST /carts/lock   4. PUT /carts/:id/billing   5. PUT /carts/:id/commit
  app.use('/tickets', ticketsRouter);        // 6. GET  /tickets/:ticketId
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
