import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env.js';
import { createDatabaseLookup } from './databaseDns.js';

export async function connectDB() {
  if (!env.mongoUri.startsWith('mongodb+srv://')) {
    throw new Error('MONGO_URI must specify the MongoDB Atlas connection. Local database fallback is disabled.');
  }
  // Configure SRV/TXT resolution for this Node process without changing system DNS.
  if (env.dnsServers.length) dns.setServers(env.dnsServers);
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    ...(env.dnsServers.length ? { lookup: createDatabaseLookup(env.dnsServers), family: 4 } : {})
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
