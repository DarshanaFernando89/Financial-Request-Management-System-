import { describe, expect, it } from 'vitest';
import { buildWorkflowSteps } from '../src/services/workflowService.js';
import { ROLES, STEP_STATUSES, STEP_TYPES } from '../src/utils/constants.js';

describe('workflowService', () => {
  it('builds a sequential workflow and appends finance payment automatically', () => {
    const steps = buildWorkflowSteps({
      workflowRoles: [ROLES.HOD, ROLES.DEAN],
      includeFinanceReview: false
    });

    expect(steps.map((step) => step.role)).toEqual([ROLES.HOD, ROLES.DEAN, ROLES.FINANCE_OFFICER]);
    expect(steps[0].status).toBe(STEP_STATUSES.PENDING);
    expect(steps[1].status).toBe(STEP_STATUSES.WAITING);
    expect(steps[2].stepType).toBe(STEP_TYPES.PAYMENT);
  });

  it('ignores workflow roles that are no longer configured as approvers', () => {
    const steps = buildWorkflowSteps({
      workflowRoles: ['LEGACY_APPROVER', ROLES.HOD, 'ARCHIVED_REVIEWER'],
      includeFinanceReview: false
    });

    expect(steps.map((step) => step.role)).toEqual([ROLES.HOD, ROLES.FINANCE_OFFICER]);
    expect(steps[0].stepType).toBe(STEP_TYPES.APPROVAL);
  });
});
