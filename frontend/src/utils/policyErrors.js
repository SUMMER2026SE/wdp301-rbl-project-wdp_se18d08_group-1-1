export const isPolicyAcceptanceRequired = (responseData) =>
  responseData?.code === 'POLICY_ACCEPTANCE_REQUIRED' ||
  responseData?.data?.code === 'POLICY_ACCEPTANCE_REQUIRED';

export const extractMissingPolicies = (responseData) =>
  responseData?.data?.missingPolicies ||
  responseData?.data?.data?.missingPolicies ||
  [];
