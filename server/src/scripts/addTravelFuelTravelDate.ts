import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { REQUEST_TYPE_CODES } from '../utils/constants.js';

async function migrate() {
  await connectDB();
  const requestType = await RequestTypeModel.findOne({
    $or: [{ code: REQUEST_TYPE_CODES.TRAVEL_FUEL }, { name: /^Travel \/ Fuel Claims$/i }]
  });
  if (!requestType) throw new Error('Travel / Fuel Claims request type was not found.');

  const previousFields = requestType.fields.map((field: any) => field.toObject());
  const travelDateField = {
    name: 'travelDate',
    label: 'Travel date',
    type: 'date',
    required: true
  };
  const travelDateIndex = previousFields.findIndex((field: any) => field.name === 'travelDate');
  const nextFields = [...previousFields];
  if (travelDateIndex < 0) nextFields.unshift(travelDateField);
  else nextFields[travelDateIndex] = { ...nextFields[travelDateIndex], ...travelDateField };

  console.log(JSON.stringify({
    requestType: requestType.name,
    previousFields,
    nextFields
  }, null, 2));
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Use --apply to add or update the required Travel date field.');
    return;
  }

  const backupDirectory = path.resolve('.local', 'request-type-migrations');
  await fs.mkdir(backupDirectory, { recursive: true });
  const backupPath = path.join(backupDirectory, `travel-fuel-travel-date-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(backupPath, JSON.stringify({
    requestType: { _id: requestType._id, name: requestType.name, fields: previousFields }
  }, null, 2), { flag: 'wx' });

  requestType.fields = nextFields as any;
  await requestType.save();
  console.log(`Updated Travel / Fuel Claims fields. Previous fields saved to ${backupPath}`);
}

migrate()
  .catch((error) => {
    console.error(String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[MongoDB URI redacted]'));
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
