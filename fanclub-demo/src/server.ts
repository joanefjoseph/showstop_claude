import { demoConfig } from './config';
import { isSeeded, openDb } from './db/connection';
import { seedDatabase } from './db/seed';
import { createMembershipApi } from './mocks/membershipApi';
import { createTicketVendorApi } from './mocks/ticketVendorApi';
const db = openDb();
if (process.argv.includes('--reset') || !isSeeded(db)) {
  console.log(`Seeding demo database at ${demoConfig.dbPath}`);
  console.table(seedDatabase(db));
}
const vendorServer = createTicketVendorApi(db).listen(demoConfig.vendorPort, () =>
  console.log(`Mock Ticket Vendor Partner API -> http://localhost:${demoConfig.vendorPort}/v1`),
);
const membershipServer = createMembershipApi(db).listen(demoConfig.membershipPort, () =>
  console.log(`Mock Membership API            -> http://localhost:${demoConfig.membershipPort}/api`),
);
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    vendorServer.close();
    membershipServer.close();
    db.close();
    process.exit(0);
  });
}