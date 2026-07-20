import { isPolicyAcceptanceRequired } from '../policyErrors';

describe('policy errors', () => {
  it('recognizes normalized API policy errors', () => {
    expect(isPolicyAcceptanceRequired({ data: { code: 'POLICY_ACCEPTANCE_REQUIRED' } })).toBe(true);
    expect(isPolicyAcceptanceRequired({ code: 'POLICY_ACCEPTANCE_REQUIRED' })).toBe(true);
  });

  it('ignores unrelated failures', () => {
    expect(isPolicyAcceptanceRequired(new Error('Network error'))).toBe(false);
  });
});
