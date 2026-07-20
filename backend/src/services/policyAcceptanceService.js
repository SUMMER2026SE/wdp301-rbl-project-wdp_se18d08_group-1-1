const Policy = require('../models/Policy');
const PolicyAcceptance = require('../models/PolicyAcceptance');

const normalizePolicy = (policy) => {
  const raw = policy?.toObject ? policy.toObject() : policy;
  const currentVersion = raw?.currentVersionId && typeof raw.currentVersionId === 'object'
    ? raw.currentVersionId
    : null;

  return {
    policyId: raw._id,
    slug: raw.slug,
    title: currentVersion?.title || raw.title,
    category: raw.category,
    description: raw.description,
    requiresAcceptance: raw.requiresAcceptance,
    versionNumber: raw.currentVersionNumber,
    policyVersionId: currentVersion?._id || raw.currentVersionId,
    effectiveDate: currentVersion?.effectiveDate || null,
    summary: currentVersion?.summary || '',
    content: currentVersion?.content || '',
  };
};

const getRequiredCurrentPolicies = async () => {
  return Policy.find({
    status: 'published',
    requiresAcceptance: true,
    deletedAt: null,
    currentVersionId: { $ne: null },
  })
    .populate('currentVersionId')
    .sort({ category: 1, title: 1 })
    .lean();
};

const getMissingRequiredPolicies = async (userId) => {
  const policies = await getRequiredCurrentPolicies();
  if (!policies.length) return [];

  const currentVersionIds = policies.map((policy) => policy.currentVersionId?._id || policy.currentVersionId);
  const acceptances = await PolicyAcceptance.find({
    userId,
    policyVersionId: { $in: currentVersionIds },
  })
    .select('policyVersionId')
    .lean();

  const acceptedVersionIds = new Set(acceptances.map((acceptance) => String(acceptance.policyVersionId)));

  return policies
    .filter((policy) => !acceptedVersionIds.has(String(policy.currentVersionId?._id || policy.currentVersionId)))
    .map(normalizePolicy);
};

const getAcceptanceStatus = async (userId) => {
  const missingPolicies = await getMissingRequiredPolicies(userId);

  return {
    hasMissingRequiredPolicies: missingPolicies.length > 0,
    missingPolicies,
  };
};

const acceptCurrentVersion = async (userId, policyId, requestMeta = {}) => {
  const policy = await Policy.findOne({
    _id: policyId,
    status: 'published',
    requiresAcceptance: true,
    deletedAt: null,
    currentVersionId: { $ne: null },
  }).lean();

  if (!policy) {
    throw Object.assign(new Error('Required published policy not found'), { statusCode: 404 });
  }

  const acceptance = await PolicyAcceptance.findOneAndUpdate(
    {
      userId,
      policyVersionId: policy.currentVersionId,
    },
    {
      $setOnInsert: {
        userId,
        policyId: policy._id,
        policyVersionId: policy.currentVersionId,
        versionNumber: policy.currentVersionNumber,
        acceptedAt: new Date(),
        ipAddress: requestMeta.ipAddress || '',
        userAgent: requestMeta.userAgent || '',
        source: requestMeta.source || 'web',
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return {
    acceptance,
    acceptanceStatus: await getAcceptanceStatus(userId),
  };
};

module.exports = {
  acceptCurrentVersion,
  getAcceptanceStatus,
  getMissingRequiredPolicies,
  getRequiredCurrentPolicies,
};
