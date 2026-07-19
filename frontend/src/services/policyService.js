import { apiFetch } from './api';

const authHeader = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const createDefaultRefundRule = () => ({
  cancellationTiers: [
    { minimumMinutesBeforeStart: 60, refundPercent: 100 },
    { minimumMinutesBeforeStart: 30, refundPercent: 50 },
    { minimumMinutesBeforeStart: 0, refundPercent: 0 },
  ],
  noShowRefundPercent: 0,
  minimumBillableMinutes: 60,
  earlyCheckout: {
    mode: 'actual_usage',
    fixedRefundPercent: 0,
    feePercent: 0,
  },
});

export const normalizeRefundRule = (rule) => {
  const defaults = createDefaultRefundRule();
  if (!rule) return defaults;

  return {
    cancellationTiers: Array.isArray(rule.cancellationTiers)
      ? rule.cancellationTiers.map((tier) => ({
          minimumMinutesBeforeStart: tier.minimumMinutesBeforeStart ?? '',
          refundPercent: tier.refundPercent ?? '',
        }))
      : defaults.cancellationTiers,
    noShowRefundPercent: rule.noShowRefundPercent ?? defaults.noShowRefundPercent,
    minimumBillableMinutes:
      rule.minimumBillableMinutes ?? defaults.minimumBillableMinutes,
    earlyCheckout: {
      ...defaults.earlyCheckout,
      ...(rule.earlyCheckout || {}),
    },
  };
};

export const validateRefundRule = (rule) => {
  const errors = {};
  const tiers = rule?.cancellationTiers || [];

  if (tiers.length === 0) {
    errors.cancellationTiers = 'Add at least one cancellation tier.';
  }

  const seenMinutes = new Set();
  tiers.forEach((tier, index) => {
    const minutes = Number(tier.minimumMinutesBeforeStart);
    const percent = Number(tier.refundPercent);
    if (tier.minimumMinutesBeforeStart === '' || !Number.isInteger(minutes) || minutes < 0) {
      errors[`tier-${index}-minutes`] = 'Minutes must be a non-negative whole number.';
    } else if (seenMinutes.has(minutes)) {
      errors[`tier-${index}-minutes`] = 'Each time threshold must be unique.';
    } else {
      seenMinutes.add(minutes);
    }
    if (tier.refundPercent === '' || !Number.isInteger(percent) || percent < 0 || percent > 100) {
      errors[`tier-${index}-percent`] = 'Refund must be a whole percentage from 0 to 100.';
    }
  });

  const percentageFields = [
    ['noShowRefundPercent', rule?.noShowRefundPercent, 'No-show refund'],
    ['earlyCheckout-feePercent', rule?.earlyCheckout?.feePercent, 'Checkout fee'],
  ];

  if (rule?.earlyCheckout?.mode === 'fixed_refund_percent') {
    percentageFields.push([
      'earlyCheckout-fixedRefundPercent',
      rule?.earlyCheckout?.fixedRefundPercent,
      'Fixed checkout refund',
    ]);
  }

  percentageFields.forEach(([key, value, label]) => {
    const number = Number(value);
    if (value === '' || value === null || value === undefined || !Number.isInteger(number) || number < 0 || number > 100) {
      errors[key] = `${label} must be a whole percentage from 0 to 100.`;
    }
  });

  const minimumMinutes = Number(rule?.minimumBillableMinutes);
  if (
    rule?.minimumBillableMinutes === '' ||
    rule?.minimumBillableMinutes === null ||
    rule?.minimumBillableMinutes === undefined ||
    !Number.isInteger(minimumMinutes) ||
    minimumMinutes < 0 ||
    minimumMinutes > 1440
  ) {
    errors.minimumBillableMinutes = 'Minimum billable time must be a whole number from 0 to 1,440.';
  }

  if (!['actual_usage', 'fixed_refund_percent', 'no_refund'].includes(rule?.earlyCheckout?.mode)) {
    errors['earlyCheckout-mode'] = 'Select a valid early-checkout mode.';
  }

  return errors;
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
