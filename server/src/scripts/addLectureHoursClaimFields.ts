import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { REQUEST_TYPE_CODES } from '../utils/constants.js';

const fields = [
  { name: 'batch', label: 'Batch', type: 'select', required: true, options: [] },
  { name: 'module', label: 'Module', type: 'select', required: true, options: [] },
  { name: 'timeSlots', label: 'Time slots', type: 'textarea', required: true, placeholder: 'Monday 08:00-10:00; Wednesday 13:00-15:00' },
  { name: 'lectureHours', label: 'Number of lecture hours', type: 'number', required: true },
  { name: 'ratePerHour', label: 'Rate per hour', type: 'number', required: true },
  { name: 'description', label: 'Description/reason', type: 'textarea', required: false }
];

async function migrate() {
  await connectDB();
  const requestType = await RequestTypeModel.findOne({
    $or: [{ code: REQUEST_TYPE_CODES.LECTURE_HOURS }, { name: /^Lecture Hours Payment$/i }]
  });
  if (!requestType) throw new Error('Lecture Hours Payment request type was not found.');

  console.log(JSON.stringify({ requestType: requestType.name, previousFields: requestType.fields, nextFields: fields }, null, 2));
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Use --apply to update the Lecture Hours Payment fields.');
    return;
  }

  const backupDirectory = path.resolve('.local', 'request-type-migrations');
  await fs.mkdir(backupDirectory, { recursive: true });
  const backupPath = path.join(backupDirectory, `lecture-hours-fields-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(backupPath, JSON.stringify({ _id: requestType._id, name: requestType.name, fields: requestType.fields }, null, 2), { flag: 'wx' });
  requestType.fields = fields as any;
  await requestType.save();
  console.log(`Updated Lecture Hours Payment fields. Previous fields saved to ${backupPath}`);
}

migrate()
  .catch((error) => {
    console.error(String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[MongoDB URI redacted]'));
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
