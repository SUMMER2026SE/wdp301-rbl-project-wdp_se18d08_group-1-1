const mongoose = require('mongoose');
const Policy = require('../models/Policy');
const PolicyVersion = require('../models/PolicyVersion');
const PolicyAcceptance = require('../models/PolicyAcceptance');

const normalizeSlug = Policy.normalizeSlug;

const pickDefined = (source, fields) =>
  fields.reduce((acc, field) => {
    if (source[field] !== undefined) acc[field] = source[field];
    return acc;
  }, {});

const ensureObjectId = (id, label = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw Object.assign(new Error(`Invalid ${label}`), { statusCode: 400 });
  }
};

const sanitizeBoolean = (value) => value === true || value === 'true';

const parseDate = (value, fallback = new Date()) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error('Invalid effective date'), { statusCode: 400 });
  }
  return date;
};

const formatPolicy = (policy) => {
  const raw = policy?.toObject ? policy.toObject() : policy;
  if (!raw) return null;

  return {
    ...raw,
    currentVersion: raw.currentVersionId && typeof raw.currentVersionId === 'object'
      ? raw.currentVersionId
      : null,
  };
};

const createPolicyWithDraft = async (payload, userId) => {
  const title = String(payload.title || '').trim();
  const content = String(payload.content || '').trim();
  const slug = normalizeSlug(payload.slug || title);

  if (!title) {
    throw Object.assign(new Error('Policy title is required'), { statusCode: 400 });
  }
  if (!slug) {
    throw Object.assign(new Error('Policy slug is required'), { statusCode: 400 });
  }
  if (!content) {
    throw Object.assign(new Error('Policy content is required'), { statusCode: 400 });
  }

  const policy = await Policy.create({
    title,
    slug,
    category: payload.category || 'other',
    description: payload.description || '',
    requiresAcceptance: sanitizeBoolean(payload.requiresAcceptance),
    status: 'draft',
    createdBy: userId,
    updatedBy: userId,
  });

  try {
    const version = await PolicyVersion.create({
      policyId: policy._id,
      versionNumber: 1,
      status: 'draft',
      title,
      summary: payload.summary || '',
      content,
      effectiveDate: parseDate(payload.effectiveDate),
      changeNote: payload.changeNote || '',
      createdBy: userId,
      updatedBy: userId,
    });

    return {
      policy,
      versions: [version],
      draftVersion: version,
    };
  } catch (error) {
    await policy.deleteOne().catch(() => {});
    throw error;
  }
};

const listAdminPolicies = async ({ includeDeleted = false } = {}) => {
  const filter = includeDeleted ? {} : { deletedAt: null };
  const policies = await Policy.find(filter)
    .populate('currentVersionId')
    .sort({ updatedAt: -1 })
    .lean();

  const currentVersionIds = policies
    .map((policy) => policy.currentVersionId?._id)
    .filter(Boolean);

  const acceptanceCounts = currentVersionIds.length
    ? await PolicyAcceptance.aggregate([
        { $match: { policyVersionId: { $in: currentVersionIds } } },
        { $group: { _id: '$policyVersionId', count: { $sum: 1 } } },
      ])
    : [];

  const countByVersion = new Map(acceptanceCounts.map((item) => [String(item._id), item.count]));

  return policies.map((policy) => ({
    ...formatPolicy(policy),
    currentVersionAcceptanceCount: policy.currentVersionId?._id
      ? countByVersion.get(String(policy.currentVersionId._id)) || 0
      : 0,
  }));
};

const listPublishedPolicies = async () => {
  const policies = await Policy.find({
    status: 'published',
    deletedAt: null,
    currentVersionId: { $ne: null },
  })
    .populate('currentVersionId')
    .sort({ category: 1, title: 1 })
    .lean();

  return policies.map(formatPolicy);
};

const getAdminPolicy = async (policyId) => {
  ensureObjectId(policyId, 'policy id');

  const policy = await Policy.findById(policyId).populate('currentVersionId').lean();
  if (!policy || policy.deletedAt) {
    throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
  }

  const versions = await PolicyVersion.find({ policyId })
    .sort({ versionNumber: -1 })
    .lean();

  const versionIds = versions.map((version) => version._id);
  const acceptanceCounts = versionIds.length
    ? await PolicyAcceptance.aggregate([
        { $match: { policyVersionId: { $in: versionIds } } },
        { $group: { _id: '$policyVersionId', count: { $sum: 1 } } },
      ])
    : [];

  const countByVersion = new Map(acceptanceCounts.map((item) => [String(item._id), item.count]));

  return {
    policy: formatPolicy(policy),
    versions: versions.map((version) => ({
      ...version,
      acceptanceCount: countByVersion.get(String(version._id)) || 0,
    })),
  };
};

const getPublishedPolicyBySlug = async (slug) => {
  const policy = await Policy.findOne({
    slug: normalizeSlug(slug),
    status: 'published',
    deletedAt: null,
    currentVersionId: { $ne: null },
  })
    .populate('currentVersionId')
    .lean();

  if (!policy) {
    throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
  }

  const versions = await PolicyVersion.find({
    policyId: policy._id,
    status: 'published',
  })
    .select('versionNumber publishedAt effectiveDate changeNote')
    .sort({ versionNumber: -1 })
    .lean();

  return {
    policy: formatPolicy(policy),
    versions,
  };
};

const getPublishedPolicyVersion = async (slug, versionNumber) => {
  const policy = await Policy.findOne({
    slug: normalizeSlug(slug),
    status: 'published',
    deletedAt: null,
  }).lean();

  if (!policy) {
    throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
  }

  const version = await PolicyVersion.findOne({
    policyId: policy._id,
    versionNumber: Number(versionNumber),
    status: 'published',
  }).lean();

  if (!version) {
    throw Object.assign(new Error('Policy version not found'), { statusCode: 404 });
  }

  return { policy, version };
};

const updatePolicyMetadata = async (policyId, payload, userId) => {
  ensureObjectId(policyId, 'policy id');

  const updateData = pickDefined(payload, ['title', 'slug', 'category', 'description', 'requiresAcceptance']);
  if (updateData.slug !== undefined) updateData.slug = normalizeSlug(updateData.slug);
  if (updateData.requiresAcceptance !== undefined) {
    updateData.requiresAcceptance = sanitizeBoolean(updateData.requiresAcceptance);
  }
  updateData.updatedBy = userId;

  const policy = await Policy.findOneAndUpdate(
    { _id: policyId, deletedAt: null },
    updateData,
    { new: true, runValidators: true }
  ).populate('currentVersionId');

  if (!policy) {
    throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
  }

  return policy;
};

const updateDraftVersion = async (policyId, versionId, payload, userId) => {
  ensureObjectId(policyId, 'policy id');
  ensureObjectId(versionId, 'version id');

  const version = await PolicyVersion.findOne({
    _id: versionId,
    policyId,
    status: 'draft',
  });

  if (!version) {
    throw Object.assign(new Error('Editable draft version not found'), { statusCode: 404 });
  }

  const updateData = pickDefined(payload, ['title', 'summary', 'content', 'effectiveDate', 'changeNote']);
  if (updateData.effectiveDate !== undefined) {
    updateData.effectiveDate = parseDate(updateData.effectiveDate, version.effectiveDate);
  }

  Object.assign(version, updateData, { updatedBy: userId });
  await version.save();

  return version;
};

const createNextDraftVersion = async (policyId, payload, userId) => {
  ensureObjectId(policyId, 'policy id');

  const policy = await Policy.findOne({ _id: policyId, deletedAt: null });
  if (!policy) {
    throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
  }

  const existingDraft = await PolicyVersion.findOne({ policyId, status: 'draft' }).lean();
  if (existingDraft) {
    throw Object.assign(new Error('This policy already has a draft version'), { statusCode: 409 });
  }

  const latestVersion = await PolicyVersion.findOne({ policyId })
    .sort({ versionNumber: -1 })
    .lean();

  const versionNumber = (latestVersion?.versionNumber || 0) + 1;

  const version = await PolicyVersion.create({
    policyId,
    versionNumber,
    status: 'draft',
    title: payload.title || latestVersion?.title || policy.title,
    summary: payload.summary !== undefined ? payload.summary : latestVersion?.summary || '',
    content: payload.content || latestVersion?.content || '',
    effectiveDate: parseDate(payload.effectiveDate, latestVersion?.effectiveDate || new Date()),
    changeNote: payload.changeNote || '',
    createdBy: userId,
    updatedBy: userId,
  });

  policy.status = policy.currentVersionId ? 'published' : 'draft';
  policy.updatedBy = userId;
  await policy.save();

  return version;
};

const publishVersion = async (policyId, versionId, userId) => {
  ensureObjectId(policyId, 'policy id');
  ensureObjectId(versionId, 'version id');

  const policy = await Policy.findOne({ _id: policyId, deletedAt: null });
  if (!policy) {
    throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
  }

  const version = await PolicyVersion.findOne({ _id: versionId, policyId });
  if (!version) {
    throw Object.assign(new Error('Policy version not found'), { statusCode: 404 });
  }

  if (version.status !== 'draft') {
    throw Object.assign(new Error('Only draft policy versions can be published'), { statusCode: 409 });
  }

  version.status = 'published';
  version.publishedAt = new Date();
  version.publishedBy = userId;
  version.updatedBy = userId;
  await version.save();

  policy.title = version.title;
  policy.status = 'published';
  policy.currentVersionId = version._id;
  policy.currentVersionNumber = version.versionNumber;
  policy.updatedBy = userId;
  policy.archivedAt = null;
  await policy.save();

  return getAdminPolicy(policyId);
};

const archivePolicy = async (policyId, userId) => {
  ensureObjectId(policyId, 'policy id');

  const policy = await Policy.findOneAndUpdate(
    { _id: policyId, deletedAt: null },
    {
      status: 'archived',
      archivedAt: new Date(),
      updatedBy: userId,
    },
    { new: true, runValidators: true }
  ).populate('currentVersionId');

  if (!policy) {
    throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
  }

  return policy;
};

const softDeletePolicy = async (policyId, userId) => {
  ensureObjectId(policyId, 'policy id');

  const policy = await Policy.findOneAndUpdate(
    { _id: policyId, deletedAt: null },
    {
      status: 'archived',
      archivedAt: new Date(),
      deletedAt: new Date(),
      updatedBy: userId,
    },
    { new: true, runValidators: true }
  ).populate('currentVersionId');

  if (!policy) {
    throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
  }

  return policy;
};

const getPolicyAcceptances = async (policyId, { page = 1, limit = 20 } = {}) => {
  ensureObjectId(policyId, 'policy id');

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (safePage - 1) * safeLimit;

  const [items, total] = await Promise.all([
    PolicyAcceptance.find({ policyId })
      .populate('userId', 'username email role')
      .populate('policyVersionId', 'versionNumber title publishedAt')
      .sort({ acceptedAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    PolicyAcceptance.countDocuments({ policyId }),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

module.exports = {
  archivePolicy,
  createNextDraftVersion,
  createPolicyWithDraft,
  getAdminPolicy,
  getPolicyAcceptances,
  getPublishedPolicyBySlug,
  getPublishedPolicyVersion,
  listAdminPolicies,
  listPublishedPolicies,
  publishVersion,
  softDeletePolicy,
  updateDraftVersion,
  updatePolicyMetadata,
};
