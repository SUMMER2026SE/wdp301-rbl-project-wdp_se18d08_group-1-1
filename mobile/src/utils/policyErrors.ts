type ErrorRecord = Record<string, unknown>;

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
