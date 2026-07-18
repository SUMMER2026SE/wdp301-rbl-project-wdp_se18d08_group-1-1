import { apiClient } from './client';
import type { APIResponse } from '@/types/api';
import type { Policy, PolicyDetail } from '@/types/models';

export const policiesService = {
  listPublishedPolicies: () => apiClient.get<APIResponse<Policy[]>>('/policies'),
  getPolicyBySlug: (slug: string) => apiClient.get<APIResponse<PolicyDetail>>(`/policies/${slug}`),
  getAcceptanceStatus: () =>
    apiClient.get<APIResponse<{ requiredPolicies?: Policy[]; unacceptedPolicies?: Policy[]; allAccepted?: boolean }>>(
      '/policies/acceptance-status',
    ),
  acceptPolicy: (policyId: string) => apiClient.post<APIResponse>(`/policies/${policyId}/accept`, { source: 'mobile' }),
};
