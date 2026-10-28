import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { ApprovalRuleModel } from '../models/ApprovalRule.js';
import { RequestTypeModel } from '../models/RequestType.js';
import { REQUEST_TYPE_CODES } from '../utils/constants.js';
import { PAPER_MARKING_BATCHES, PAPER_MARKING_MODULE_RATES } from '../utils/paperMarkingCatalog.js';

async function migrate() {
  await connectDB();
  const requestType = await RequestTypeModel.findOne({
    $or: [{ code: REQUEST_TYPE_CODES.PAPER_MARKING }, { name: /^Paper Marking$/i }]
  });
  if (!requestType) throw new Error('Paper Marking request type was not found.');

  const previousFields = requestType.fields.map((field: any) => field.toObject());
  const moduleField = previousFields.find((field: any) => ['module', 'courseName'].includes(field.name));
  const configuredRates = moduleField?.validationRules?.ratePerPaperByModule || PAPER_MARKING_MODULE_RATES;
  const configuredStudentCounts = moduleField?.validationRules?.studentCountByBatchAndModule || {};
  const modules = moduleField?.options?.length ? moduleField.options : Object.keys(configuredRates);
  const batchField = previousFields.find((field: any) => field.name === 'batch');
  const batches = batchField?.options?.length ? batchField.options : PAPER_MARKING_BATCHES;
  const fields = previousFields.filter((field: any) => field.name !== 'examDate').map((field: any) => {
    if (['module', 'courseName'].includes(field.name)) {
      return {
        ...field,
        label: 'Module',
        type: 'select',
        required: true,
        options: modules,
        validationRules: {
          ...field.validationRules,
          ratePerPaperByModule: configuredRates,
          studentCountByBatchAndModule: configuredStudentCounts
        }
      };
    }
    if (field.name === 'batch') {
      return { ...field, label: 'Batch', type: 'select', required: true, options: batches };
    }
    if (field.name === 'numberOfPapers') return { ...field, label: 'Total papers', required: true };
    if (field.name === 'examName') return { ...field, required: true };
    if (field.name === 'ratePerPaper') return { ...field, label: 'Rate per paper (LKR)', required: true };
    return field;
  });

  if (!fields.some((field: any) => ['module', 'courseName'].includes(field.name))) {
    fields.push({
      name: 'courseName',
      label: 'Module',
      type: 'select',
      required: true,
      options: modules,
      validationRules: {
        ratePerPaperByModule: configuredRates,
        studentCountByBatchAndModule: configuredStudentCounts
      }
    });
  }
  if (!fields.some((field: any) => field.name === 'batch')) {
    const moduleIndex = fields.findIndex((field: any) => ['module', 'courseName'].includes(field.name));
    fields.splice(moduleIndex < 0 ? fields.length : moduleIndex + 1, 0, {
      name: 'batch',
      label: 'Batch',
      type: 'select',
      required: true,
      options: batches
    });
  }
  if (!fields.some((field: any) => field.name === 'numberOfPapers')) {
    fields.push({ name: 'numberOfPapers', label: 'Total papers', type: 'number', required: true });
  }
  if (!fields.some((field: any) => field.name === 'ratePerPaper')) {
    fields.push({ name: 'ratePerPaper', label: 'Rate per paper (LKR)', type: 'number', required: true });
  }

  const activeRules = await ApprovalRuleModel.find({ isActive: true }).populate('requestTypes', 'code name');
  const lectureRules = activeRules.filter((rule: any) =>
    rule.requestTypes.some((type: any) =>
      type.code === REQUEST_TYPE_CODES.LECTURE_HOURS || type.name === 'Lecture Hours Payment'
    )
  );
  const existingPaperRules = activeRules.filter((rule: any) =>
    rule.requestTypes.some((type: any) =>
      type.code === REQUEST_TYPE_CODES.PAPER_MARKING || type.name === 'Paper Marking'
    )
  );
  const sourceRules = lectureRules.length ? lectureRules : existingPaperRules;
  if (!sourceRules.length) {
    throw new Error('No active academic approval rules were found. Create or activate a rule for lecture hours or examination duties, then rerun this migration.');
  }

  const paperTypeIsLinked = (rule: any) => rule.requestTypes.some((type: any) => type._id.equals(requestType._id));
  const isDedicatedPaperRule = (rule: any) =>
    paperTypeIsLinked(rule) && rule.requestTypes.length === 1;
  const paperRuleName = sourceRules.length === 1 ? 'Paper Marking' : 'Paper Marking -';
  const rulesToCreate = sourceRules.filter((source: any) => {
    const name = sourceRules.length === 1 ? paperRuleName : `${paperRuleName} ${source.name}`;
    return !existingPaperRules.some((existing: any) =>
      isDedicatedPaperRule(existing) &&
      existing.name === name &&
      existing.minAmount === source.minAmount &&
      existing.maxAmount === source.maxAmount &&
      existing.priority === source.priority
    );
  });
  const rulesToUnlink = lectureRules.filter((rule: any) => paperTypeIsLinked(rule));

  console.log(JSON.stringify({
    requestType: requestType.name,
    previousFields,
    nextFields: fields,
    claimTypeRulesToCreate: rulesToCreate.map((rule: any) => ({
      name: sourceRules.length === 1 ? paperRuleName : `${paperRuleName} ${rule.name}`,
      minAmount: rule.minAmount,
      maxAmount: rule.maxAmount,
      workflowRoles: rule.workflowRoles,
      priority: rule.priority
    })),
    lectureRulesToUnlink: rulesToUnlink.map((rule: any) => ({ _id: rule._id, name: rule.name }))
  }, null, 2));
  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Use --apply to remove the Paper Marking exam-date field and configure batch-based claims.');
    return;
  }

  const backupDirectory = path.resolve('.local', 'request-type-migrations');
  await fs.mkdir(backupDirectory, { recursive: true });
  const backupPath = path.join(backupDirectory, `paper-marking-setup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(backupPath, JSON.stringify({
    requestType: { _id: requestType._id, name: requestType.name, fields: previousFields },
    approvalRules: [...new Map([...sourceRules, ...existingPaperRules].map((rule: any) => [rule._id.toString(), rule])).values()]
      .map((rule: any) => rule.toObject())
  }, null, 2), { flag: 'wx' });

  requestType.fields = fields as any;
  requestType.isActive = true;
  requestType.isVisibleToRequester = false;
  await requestType.save();
  for (const rule of rulesToCreate) {
    const source = rule.toObject();
    delete source._id;
    delete source.createdAt;
    delete source.updatedAt;
    await ApprovalRuleModel.create({
      ...source,
      name: sourceRules.length === 1 ? paperRuleName : `${paperRuleName} ${rule.name}`,
      requestTypes: [requestType._id],
      isActive: true
    });
  }
  for (const rule of rulesToUnlink) {
    rule.requestTypes = rule.requestTypes.filter((type: any) => !type._id.equals(requestType._id));
    await rule.save();
  }
  console.log(`Created ${rulesToCreate.length} separate Paper Marking claim type rule(s) and removed it from ${rulesToUnlink.length} lecture-hours rule(s). Previous settings saved to ${backupPath}`);
}

migrate()
  .catch((error) => {
    console.error(String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[MongoDB URI redacted]'));
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
