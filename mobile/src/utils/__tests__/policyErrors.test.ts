import { extractMissingPolicies, isPolicyAcceptanceRequired } from '../policyErrors';

const missingPolicy = {
  policyId: 'policy-1',
  policyVersionId: 'version-2',
  slug: 'booking-policy',
  title: 'Booking policy',
  versionNumber: 2,
};

describe('policy errors', () => {
  it('recognizes normalized API policy errors', () => {
    expect(isPolicyAcceptanceRequired({ data: { code: 'POLICY_ACCEPTANCE_REQUIRED' } })).toBe(true);
    expect(isPolicyAcceptanceRequired({ code: 'POLICY_ACCEPTANCE_REQUIRED' })).toBe(true);
  });

  it('ignores unrelated failures', () => {
    expect(isPolicyAcceptanceRequired(new Error('Network error'))).toBe(false);
  });

  it('extracts missing policies from normalized API errors', () => {
    expect(extractMissingPolicies({ data: { missingPolicies: [missingPolicy] } })).toEqual([missingPolicy]);
  });

  it('extracts missing policies from nested backend envelopes', () => {
    expect(extractMissingPolicies({ data: { data: { missingPolicies: [missingPolicy] } } })).toEqual([missingPolicy]);
  });

  it('returns an empty array for missing or invalid policy data', () => {
    expect(extractMissingPolicies(null)).toEqual([]);
    expect(extractMissingPolicies({ data: { missingPolicies: 'invalid' } })).toEqual([]);
    expect(extractMissingPolicies({ data: { missingPolicies: [{ slug: 'incomplete' }] } })).toEqual([]);
  });
});
