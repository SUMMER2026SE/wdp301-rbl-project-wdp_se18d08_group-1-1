import { apiFetch } from './api';

const authHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getPolicies = () => apiFetch('/policies');

export const getPolicyBySlug = (slug) => apiFetch(`/policies/${slug}`);

export const getPolicyVersion = (slug, versionNumber) =>
  apiFetch(`/policies/${slug}/versions/${versionNumber}`);

export const getPolicyAcceptanceStatus = () =>
  apiFetch('/policies/acceptance-status', {
    headers: authHeader(),
  });

export const acceptPolicy = (policyId) =>
  apiFetch(`/policies/${policyId}/accept`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ source: 'web' }),
  });

export const getAdminPolicies = () =>
  apiFetch('/admin/policies', {
    headers: authHeader(),
  });

export const getAdminPolicy = (id) =>
  apiFetch(`/admin/policies/${id}`, {
    headers: authHeader(),
  });

export const createPolicy = (payload) =>
  apiFetch('/admin/policies', {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });

export const updatePolicy = (id, payload) =>
  apiFetch(`/admin/policies/${id}`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });

export const createPolicyVersion = (id, payload = {}) =>
  apiFetch(`/admin/policies/${id}/versions`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });

export const updatePolicyVersion = (id, versionId, payload) =>
  apiFetch(`/admin/policies/${id}/versions/${versionId}`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify(payload),
  });

export const publishPolicyVersion = (id, versionId) =>
  apiFetch(`/admin/policies/${id}/versions/${versionId}/publish`, {
    method: 'POST',
    headers: authHeader(),
  });

export const archivePolicy = (id) =>
  apiFetch(`/admin/policies/${id}/archive`, {
    method: 'PATCH',
    headers: authHeader(),
  });

export const deletePolicy = (id) =>
  apiFetch(`/admin/policies/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });

export const getPolicyAcceptances = (id, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`/admin/policies/${id}/acceptances${query ? `?${query}` : ''}`, {
    headers: authHeader(),
  });
};
