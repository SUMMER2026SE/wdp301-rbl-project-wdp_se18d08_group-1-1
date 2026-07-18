import { apiClient } from '../api/client';
import { policiesService } from '../api/policies';

describe('policiesService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const currentVersion = {
    _id: 'version-1',
    policyId: 'policy-1',
    versionNumber: 3,
    title: 'Updated terms',
    summary: 'Updated summary',
    content: 'Policy content',
    publishedAt: '2026-07-15T00:00:00.000Z',
  };

  const policy = {
    _id: 'policy-1',
    slug: 'terms',
    title: 'Terms',
    category: 'terms' as const,
    currentVersionNumber: 3,
    currentVersion,
    requiresAcceptance: true,
  };

  it('normalizes policies and marks the missing current version as unread', async () => {
    jest.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ success: true, data: [policy] })
      .mockResolvedValueOnce({
        success: true,
        data: {
          hasMissingRequiredPolicies: true,
          missingPolicies: [{
            policyId: 'policy-1',
            slug: 'terms',
            title: currentVersion.title,
            versionNumber: 3,
          }],
        },
      });

    const response = await policiesService.listPublishedPolicies();

    expect(response.data?.[0]).toMatchObject({
      title: currentVersion.title,
      description: currentVersion.summary,
      versionNumber: 3,
      isAccepted: false,
    });
    expect(typeof response.data?.[0].versionNumber).not.toBe('object');
  });

  it('marks a required policy as accepted when it is absent from missingPolicies', async () => {
    jest.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ success: true, data: [policy] })
      .mockResolvedValueOnce({
        success: true,
        data: { hasMissingRequiredPolicies: false, missingPolicies: [] },
      });

    const response = await policiesService.listPublishedPolicies();

    expect(response.data?.[0].isAccepted).toBe(true);
  });

  it('unwraps policy detail and preserves the accepted state', async () => {
    jest.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        success: true,
        data: {
          policy,
          versions: [{ ...currentVersion, changeNote: 'Terms updated' }],
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { hasMissingRequiredPolicies: false, missingPolicies: [] },
      });

    const response = await policiesService.getPolicyBySlug('terms');

    expect(response.data).toMatchObject({
      content: currentVersion.content,
      versionNumber: 3,
      isAccepted: true,
      versionHistory: [{ versionNumber: 3, changeSummary: 'Terms updated' }],
    });
  });
});
