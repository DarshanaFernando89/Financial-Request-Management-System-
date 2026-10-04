import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { connectDB } from '../config/db.js';
import { rolesAfterRemovingRequester } from '../utils/retiredRoleMigration.js';

async function migrate() {
  await connectDB();
  const collection = mongoose.connection.db.collection('users');
  const users = await collection.find({ roles: 'REQUESTER' }, { projection: { email: 1, roles: 1 } }).toArray();
  const changes = users.map((user) => ({
    _id: user._id,
    email: user.email,
    previousRoles: user.roles as string[],
    roles: rolesAfterRemovingRequester(user.roles as string[])
  }));
  console.log(JSON.stringify({ affectedAccounts: changes.length, changes }, null, 2));
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Use --apply to update these role assignments.');
    return;
  }
  if (!changes.length) return;

  const backupDirectory = path.resolve('.local', 'role-migrations');
  await fs.mkdir(backupDirectory, { recursive: true });
  const backupPath = path.join(backupDirectory, `requester-roles-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(backupPath, JSON.stringify(changes, null, 2), { flag: 'wx' });
  console.log(`Previous role assignments saved to ${backupPath}`);

  const result = await collection.bulkWrite(changes.map((change) => ({
    updateOne: {
      filter: { _id: change._id, roles: change.previousRoles },
      update: { $set: { roles: change.roles } }
    }
  })));
  if (result.matchedCount !== changes.length) {
    throw new Error('Some roles changed during migration. Review the saved assignments and rerun the migration.');
  }
  console.log(`Updated ${result.modifiedCount} accounts.`);
}

migrate()
  .catch((error) => {
    console.error(String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[MongoDB URI redacted]'));
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
