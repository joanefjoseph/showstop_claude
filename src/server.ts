import { createApp } from './app.ts';
import { config } from './config.ts';
const app = createApp();
const server = app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`fanclub-ticketing-bridge listening on :${config.PORT} (${config.NODE_ENV})`);
});
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    // eslint-disable-next-line no-console
    console.log(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
