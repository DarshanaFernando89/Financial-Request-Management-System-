import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { ApprovalRuleModel } from '../models/ApprovalRule.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { ROLES, REQUEST_TYPE_CODES } from '../utils/constants.js';

const ruleDefinition = {
  name: 'Lecture Hours Payment',
  minAmount: 0,
  maxAmount: null,
  workflowRoles: [ROLES.HOD, ROLES.DEAN],
  priority: 10,
  isActive: true
};

async function createRule() {
  await connectDB();
  const requestType = await RequestTypeModel.findOne({
    $or: [{ code: REQUEST_TYPE_CODES.LECTURE_HOURS }, { name: /^Lecture Hours Payment$/i }]
  });
  if (!requestType) throw new Error('Lecture Hours Payment request type was not found.');

  const existing = await ApprovalRuleModel.findOne({
    name: ruleDefinition.name,
    requestTypes: requestType._id
  });
  const nextRule = { ...ruleDefinition, requestTypes: [requestType._id] };
  console.log(JSON.stringify({ requestType: requestType.name, existingRule: existing?.toObject(), nextRule }, null, 2));

  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Use --apply to create or update the Lecture Hours Payment rule.');
    return;
  }

  const rule = await ApprovalRuleModel.findOneAndUpdate(
    { name: ruleDefinition.name, requestTypes: requestType._id },
    nextRule,
    { new: true, upsert: true, runValidators: true }
  );
  console.log(`Lecture Hours Payment rule is active: ${rule._id}`);
}

createRule()
  .catch((error) => {
    console.error(String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[MongoDB URI redacted]'));
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
