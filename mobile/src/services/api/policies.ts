import { apiClient } from './client';
import type { APIResponse } from '@/types/api';
import type {
  Policy,
  PolicyAcceptanceStatus,
  PolicyDetail,
  PolicyVersion,
} from '@/types/models';

interface PolicyDetailEnvelope {
  policy: Policy;
  versions?: PolicyVersion[];
}

const normalizePolicy = (policy: Policy): Policy => ({
  ...policy,
  title: policy.currentVersion?.title || policy.title,
  description: policy.currentVersion?.summary || policy.description,
  versionNumber:
    policy.currentVersionNumber ?? policy.currentVersion?.versionNumber ?? policy.versionNumber,
  publishedAt: policy.currentVersion?.publishedAt || policy.publishedAt,
});

const normalizePolicyDetail = ({ policy, versions = [] }: PolicyDetailEnvelope): PolicyDetail => {
  const normalized = normalizePolicy(policy);
  return {
    ...normalized,
    content: policy.currentVersion?.content || '',
    versionHistory: versions.map((version) => ({
      versionNumber: version.versionNumber,
      publishedAt: version.publishedAt,
      changeSummary: version.changeNote || version.summary,
    })),
  };
};

const withAcceptanceStatus = <T extends Policy>(
  policy: T,
  status: PolicyAcceptanceStatus,
): T => {
  if (!policy.requiresAcceptance) return policy;

  const policyId = String(policy._id || policy.id || '');
  const currentVersion = String(
    policy.currentVersionNumber ?? policy.versionNumber ?? policy.currentVersion?.versionNumber ?? '',
  );
  const isMissing = status.missingPolicies.some((missing) => {
    const samePolicy = String(missing.policyId) === policyId || missing.slug === policy.slug;
    return samePolicy && String(missing.versionNumber) === currentVersion;
  });

  return { ...policy, isAccepted: !isMissing };
};

export const policiesService = {
  listPublishedPolicies: async () => {
    const [response, acceptanceResponse] = await Promise.all([
      apiClient.get<APIResponse<Policy[]>>('/policies'),
      apiClient.get<APIResponse<PolicyAcceptanceStatus>>('/policies/acceptance-status'),
    ]);
    const acceptanceStatus = acceptanceResponse.data || {
      hasMissingRequiredPolicies: false,
      missingPolicies: [],
    };
    return {
      ...response,
      data: (response.data || [])
        .map(normalizePolicy)
        .map((policy) => withAcceptanceStatus(policy, acceptanceStatus)),
    };
  },
  getPolicyBySlug: async (slug: string) => {
    const [response, acceptanceResponse] = await Promise.all([
      apiClient.get<APIResponse<PolicyDetailEnvelope>>(`/policies/${slug}`),
      apiClient.get<APIResponse<PolicyAcceptanceStatus>>('/policies/acceptance-status'),
    ]);
    const acceptanceStatus = acceptanceResponse.data || {
      hasMissingRequiredPolicies: false,
      missingPolicies: [],
    };
    const detail = response.data ? normalizePolicyDetail(response.data) : undefined;
    return {
      ...response,
      data: detail ? withAcceptanceStatus(detail, acceptanceStatus) : undefined,
    };
  },
  getAcceptanceStatus: () =>
    apiClient.get<APIResponse<PolicyAcceptanceStatus>>('/policies/acceptance-status'),
  acceptPolicy: (policyId: string) => apiClient.post<APIResponse>(`/policies/${policyId}/accept`, { source: 'mobile' }),
};
