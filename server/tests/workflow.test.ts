import { describe, expect, it } from 'vitest';
import { buildWorkflowSteps, validateClarificationResponse } from '../src/services/workflowService.js';
import { ROLES, STEP_STATUSES, STEP_TYPES } from '../src/utils/constants.js';

describe('workflowService', () => {
  it('builds a sequential workflow and appends finance payment automatically', () => {
    const steps = buildWorkflowSteps({
      workflowRoles: [ROLES.HOD, ROLES.ASSOCIATE_DEAN],
      includeFinanceReview: false
    });

    expect(steps.map((step) => step.role)).toEqual([ROLES.HOD, ROLES.ASSOCIATE_DEAN, ROLES.FINANCE_OFFICER]);
    expect(steps[0].status).toBe(STEP_STATUSES.PENDING);
    expect(steps[1].status).toBe(STEP_STATUSES.WAITING);
    expect(steps[2].stepType).toBe(STEP_TYPES.PAYMENT);
  });

  it('marks department coordinator as a verification step', () => {
    const steps = buildWorkflowSteps({
      workflowRoles: [ROLES.DEPARTMENT_COORDINATOR, ROLES.HOD],
      includeFinanceReview: false
    });

    expect(steps[0].stepType).toBe(STEP_TYPES.VERIFICATION);
    expect(steps[1].stepType).toBe(STEP_TYPES.APPROVAL);
  });

  it('requires at least one document when returning from clarification', () => {
    expect(() => validateClarificationResponse({ documents: [] })).toThrowError(/At least one supporting document/i);
  });
});
