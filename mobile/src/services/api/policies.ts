import { apiClient } from './client';

export const policiesService = {
  listPublishedPolicies: () => apiClient.get('/policies'),
  getAcceptanceStatus: () => apiClient.get('/policies/acceptance-status'),
  acceptPolicy: (policyId: string) => apiClient.post(`/policies/${policyId}/accept`),
};
