type ErrorRecord = Record<string, unknown>;

export interface MissingPolicy {
  policyId: string;
  policyVersionId?: string;
  slug: string;
  title: string;
  versionNumber: string | number;
}

const asRecord = (value: unknown): ErrorRecord | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as ErrorRecord)
    : undefined;

export const isPolicyAcceptanceRequired = (error: unknown) => {
  const root = asRecord(error);
  const response = asRecord(root?.data);
  return root?.code === 'POLICY_ACCEPTANCE_REQUIRED'
    || response?.code === 'POLICY_ACCEPTANCE_REQUIRED';
};

const isMissingPolicy = (value: unknown): value is MissingPolicy => {
  const policy = asRecord(value);
  return Boolean(
    policy
    && typeof policy.policyId === 'string'
    && typeof policy.slug === 'string'
    && typeof policy.title === 'string'
    && (typeof policy.versionNumber === 'string' || typeof policy.versionNumber === 'number'),
  );
};

export const extractMissingPolicies = (error: unknown): MissingPolicy[] => {
  const root = asRecord(error);
  const response = asRecord(root?.data);
  const nestedResponse = asRecord(response?.data);
  const missingPolicies = response?.missingPolicies ?? nestedResponse?.missingPolicies;

  return Array.isArray(missingPolicies) ? missingPolicies.filter(isMissingPolicy) : [];
};
