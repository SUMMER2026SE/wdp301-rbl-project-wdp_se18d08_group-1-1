import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react';
import RefundRuleEditor from '../../components/policies/RefundRuleEditor';
import RefundRulePreview from '../../components/policies/RefundRulePreview';
import {
  archivePolicy,
  createDefaultRefundRule,
  createPolicy,
  createPolicyVersion,
  deletePolicy,
  getAdminPolicies,
  getAdminPolicy,
  publishPolicyVersion,
  normalizeRefundRule,
  updatePolicy,
  updatePolicyVersion,
  validateRefundRule,
} from '../../services/policyService';

const categories = [
  ['terms', 'Terms'],
  ['privacy', 'Privacy'],
  ['refund', 'Refund'],
  ['parking_rules', 'Parking rules'],
  ['safety', 'Safety'],
  ['other', 'Other'],
];

const emptyCreateForm = {
  title: '',
  slug: '',
  category: 'terms',
  description: '',
  requiresAcceptance: true,
  controlsBookingRefunds: false,
  summary: '',
  content: '',
  effectiveDate: '',
  changeNote: '',
  refundRule: null,
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
    : '-';

const statusClass = (status) => {
  if (status === 'published') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (status === 'archived') return 'border-gray-500/20 bg-gray-500/10 text-gray-300';
  return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
};

export default function PolicyManagement() {
  const [policies, setPolicies] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [metadata, setMetadata] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [createRuleErrors, setCreateRuleErrors] = useState({});
  const [draftRuleErrors, setDraftRuleErrors] = useState({});

  const selectedPolicy = detail?.policy;
  const versions = useMemo(() => detail?.versions || [], [detail?.versions]);
  const activeDraft = useMemo(
    () => versions.find((version) => version.status === 'draft') || null,
    [versions]
  );

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchPolicies = async () => {
    const res = await getAdminPolicies();
    if (res.ok && res.data?.success) {
      setPolicies(res.data.data || []);
    } else {
      setError(res.data?.message || 'Unable to load policies.');
    }
  };

  const loadDetail = async (id) => {
    if (!id) return;
    setDetailLoading(true);
    setError('');
    const res = await getAdminPolicy(id);
    if (res.ok && res.data?.success) {
      const nextDetail = res.data.data;
      setDetail(nextDetail);
      setMetadata({
        title: nextDetail.policy.title || '',
        slug: nextDetail.policy.slug || '',
        category: nextDetail.policy.category || 'other',
        description: nextDetail.policy.description || '',
        requiresAcceptance: Boolean(nextDetail.policy.requiresAcceptance),
        controlsBookingRefunds: Boolean(nextDetail.policy.controlsBookingRefunds),
      });

      const nextDraft = nextDetail.versions.find((version) => version.status === 'draft') || null;
      setDraft(
        nextDraft
          ? {
              title: nextDraft.title || '',
              summary: nextDraft.summary || '',
              content: nextDraft.content || '',
              effectiveDate: nextDraft.effectiveDate
                ? new Date(nextDraft.effectiveDate).toISOString().slice(0, 10)
                : '',
              changeNote: nextDraft.changeNote || '',
              refundRule: nextDetail.policy.controlsBookingRefunds
                ? normalizeRefundRule(nextDraft.refundRule)
                : null,
            }
          : null
      );
      setDraftRuleErrors({});
    } else {
      setError(res.data?.message || 'Unable to load policy details.');
    }
    setDetailLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPolicies().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const ruleErrors = createForm.controlsBookingRefunds
      ? validateRefundRule(createForm.refundRule)
      : {};
    setCreateRuleErrors(ruleErrors);
    if (Object.keys(ruleErrors).length > 0) {
      setError('Please fix the refund rule errors before creating this policy.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      ...createForm,
      refundRule: createForm.controlsBookingRefunds
        ? normalizeRefundRule(createForm.refundRule)
        : undefined,
    };
    const res = await createPolicy(payload);
    if (res.ok && res.data?.success) {
      showToast('Draft created');
      setCreateForm(emptyCreateForm);
      setIsCreating(false);
      await fetchPolicies();
      setSelectedId(res.data.data._id);
    } else {
      setError(res.data?.message || 'Unable to create policy.');
    }
    setSaving(false);
  };

  const handleMetadataSave = async () => {
    if (!selectedPolicy) return;
    setSaving(true);
    setError('');
    const res = await updatePolicy(selectedPolicy._id, metadata);
    if (res.ok && res.data?.success) {
      showToast('Policy metadata saved');
      await fetchPolicies();
      await loadDetail(selectedPolicy._id);
    } else {
      setError(res.data?.message || 'Unable to save metadata.');
    }
    setSaving(false);
  };

  const handleDraftSave = async () => {
    if (!selectedPolicy || !activeDraft) return;
    const ruleErrors = selectedPolicy.controlsBookingRefunds
      ? validateRefundRule(draft?.refundRule)
      : {};
    setDraftRuleErrors(ruleErrors);
    if (Object.keys(ruleErrors).length > 0) {
      setError('Please fix the refund rule errors before saving this draft.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      ...draft,
      refundRule: selectedPolicy.controlsBookingRefunds
        ? normalizeRefundRule(draft.refundRule)
        : undefined,
    };
    const res = await updatePolicyVersion(selectedPolicy._id, activeDraft._id, payload);
    if (res.ok && res.data?.success) {
      showToast('Draft saved');
      await loadDetail(selectedPolicy._id);
    } else {
      setError(res.data?.message || 'Unable to save draft.');
    }
    setSaving(false);
  };

  const handleCreateNextDraft = async () => {
    if (!selectedPolicy) return;
    setSaving(true);
    setError('');
    const current = selectedPolicy.currentVersion || {};
    const currentPublishedVersion = versions.find(
      (version) =>
        version.status === 'published' &&
        version.versionNumber === selectedPolicy.currentVersionNumber
    );
    const res = await createPolicyVersion(selectedPolicy._id, {
      title: current.title || selectedPolicy.title,
      summary: current.summary || '',
      content: current.content || '',
      effectiveDate: current.effectiveDate,
      refundRule: selectedPolicy.controlsBookingRefunds
        ? normalizeRefundRule(current.refundRule || currentPublishedVersion?.refundRule)
        : undefined,
    });
    if (res.ok && res.data?.success) {
      showToast('New draft version created');
      await loadDetail(selectedPolicy._id);
    } else {
      setError(res.data?.message || 'Unable to create draft version.');
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!selectedPolicy || !activeDraft) return;
    const ruleErrors = selectedPolicy.controlsBookingRefunds
      ? validateRefundRule(draft?.refundRule)
      : {};
    setDraftRuleErrors(ruleErrors);
    if (Object.keys(ruleErrors).length > 0) {
      setError('Please fix the refund rule errors before publishing this draft.');
      return;
    }

    const confirmed = window.confirm(
      selectedPolicy.controlsBookingRefunds
        ? 'Publish this draft? The policy text and executable refund rules will become immutable together and will apply to newly paid bookings.'
        : 'Publish this draft? Published versions cannot be edited later.'
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    const res = await publishPolicyVersion(selectedPolicy._id, activeDraft._id);
    if (res.ok && res.data?.success) {
      showToast('Policy version published');
      await fetchPolicies();
      await loadDetail(selectedPolicy._id);
    } else {
      setError(res.data?.message || 'Unable to publish policy.');
    }
    setSaving(false);
  };

  const handleArchive = async () => {
    if (!selectedPolicy) return;
    const confirmed = window.confirm('Archive this policy? It will disappear from public policy pages.');
    if (!confirmed) return;

    setSaving(true);
    const res = await archivePolicy(selectedPolicy._id);
    if (res.ok && res.data?.success) {
      showToast('Policy archived');
      await fetchPolicies();
      await loadDetail(selectedPolicy._id);
    } else {
      setError(res.data?.message || 'Unable to archive policy.');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedPolicy) return;
    const confirmed = window.confirm('Soft-delete this policy? Published history and acceptances are retained.');
    if (!confirmed) return;

    setSaving(true);
    const res = await deletePolicy(selectedPolicy._id);
    if (res.ok && res.data?.success) {
      showToast('Policy deleted');
      setSelectedId('');
      setDetail(null);
      await fetchPolicies();
    } else {
      setError(res.data?.message || 'Unable to delete policy.');
    }
    setSaving(false);
  };

  return (
    <div className="p-6 md:p-8 mx-auto min-h-[calc(100vh-70px)] overflow-auto bg-[#080808] text-white">
      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-2xl border border-emerald-500/20 bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-2xl">
          {toast}
        </div>
      )}

      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
              <FileText size={13} />
              Policy Manager
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Versioned Policies
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Manage editable drafts, immutable published versions, and customer acceptance records.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <section className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-[#171717] flex flex-col h-[calc(100vh-140px)]">
              <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
                <h2 className="font-black">Policies</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId('');
                    setDetail(null);
                    setIsCreating(true);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${isCreating ? 'bg-yellow-400 text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                >
                  <Plus size={14} />
                  New Policy
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3">
                {loading ? (
                  <div className="flex items-center justify-center gap-3 py-12 text-sm font-bold text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    Loading policies
                  </div>
                ) : policies.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-gray-500">
                    No policies yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {policies.map((policy) => (
                      <button
                        key={policy._id}
                        type="button"
                        onClick={() => {
                          setIsCreating(false);
                          setSelectedId(policy._id);
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selectedId === policy._id
                            ? 'border-yellow-400/60 bg-yellow-400/10'
                            : 'border-white/5 bg-black/40 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-white">{policy.title}</p>
                            <p className="mt-1 text-[11px] font-semibold text-gray-500">
                              /{policy.slug} - v{policy.currentVersionNumber || 0}
                            </p>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase whitespace-nowrap ${statusClass(policy.status)}`}>
                            {policy.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#171717] p-5 lg:p-7 min-h-[calc(100vh-140px)]">
            {isCreating ? (
              <div className="max-w-2xl">
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-400">
                    <Plus size={20} />
                  </div>
                  <h2 className="text-xl font-black">Create New Policy</h2>
                </div>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-gray-500">Title</span>
                      <input
                        value={createForm.title}
                        onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                        placeholder="e.g. Terms of Service"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-gray-500">Slug (Optional)</span>
                      <input
                        value={createForm.slug}
                        onChange={(event) => setCreateForm((current) => ({ ...current, slug: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                        placeholder="e.g. terms-of-service"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-gray-500">Category</span>
                      <select
                        value={createForm.category}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            category: event.target.value,
                            controlsBookingRefunds:
                              event.target.value === 'refund'
                                ? current.controlsBookingRefunds
                                : false,
                            refundRule:
                              event.target.value === 'refund' ? current.refundRule : null,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                      >
                        {categories.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-end">
                      <label className="flex h-[46px] w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 text-sm font-bold text-gray-300 transition hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={createForm.requiresAcceptance}
                          onChange={(event) => setCreateForm((current) => ({ ...current, requiresAcceptance: event.target.checked }))}
                          className="h-4 w-4 accent-yellow-400"
                        />
                        Requires customer acceptance
                      </label>
                    </div>
                  </div>
                  {createForm.category === 'refund' && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] p-4 text-sm font-bold text-gray-200 transition hover:bg-yellow-400/10">
                      <input
                        type="checkbox"
                        checked={createForm.controlsBookingRefunds}
                        onChange={(event) => {
                          setCreateForm((current) => ({
                            ...current,
                            controlsBookingRefunds: event.target.checked,
                            refundRule: event.target.checked
                              ? normalizeRefundRule(current.refundRule || createDefaultRefundRule())
                              : null,
                          }));
                          setCreateRuleErrors({});
                          setError('');
                        }}
                        className="mt-0.5 h-4 w-4 accent-yellow-400"
                      />
                      <div>
                        Control booking refunds
                        <span className="mt-1 block text-xs font-normal leading-relaxed text-gray-400">
                          Designate this refund policy as the executable rule source. Only one policy can be designated.
                        </span>
                      </div>
                    </label>
                  )}
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-gray-500">Initial Content</span>
                    <textarea
                      value={createForm.content}
                      onChange={(event) => setCreateForm((current) => ({ ...current, content: event.target.value }))}
                      className="min-h-48 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm leading-relaxed outline-none focus:border-yellow-400"
                      placeholder="Write your policy content here..."
                      required
                    />
                  </label>
                  {createForm.controlsBookingRefunds && (
                    <div className="pt-2">
                      <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-gray-500">Refund Rules Configuration</h3>
                      <RefundRuleEditor
                        value={createForm.refundRule}
                        onChange={(refundRule) => {
                          setCreateForm((current) => ({ ...current, refundRule }));
                          setCreateRuleErrors(validateRefundRule(refundRule));
                          setError('');
                        }}
                        errors={createRuleErrors}
                      />
                    </div>
                  )}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3.5 text-sm font-black text-black shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:opacity-60 sm:w-auto sm:px-8"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Create Policy
                    </button>
                  </div>
                </form>
              </div>
            ) : !selectedPolicy ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                <FileText size={56} className="mb-4 text-gray-800" strokeWidth={1} />
                <p className="text-lg font-black text-gray-300">No Policy Selected</p>
                <p className="mt-2 text-sm max-w-sm">Select a policy from the list on the left to edit metadata, drafts, and versions, or create a new one.</p>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="mt-6 flex items-center gap-2 rounded-full border border-white/10 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-white/5"
                >
                  <Plus size={16} />
                  Create New Policy
                </button>
              </div>
            ) : detailLoading ? (
              <div className="flex min-h-[520px] items-center justify-center gap-3 text-sm font-bold text-gray-400">
                <Loader2 size={18} className="animate-spin" />
                Loading policy detail
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start">
                  <div>
                    <h2 className="text-2xl font-black">{selectedPolicy.title}</h2>
                    <p className="mt-2 text-sm text-gray-400">
                      Current published version: v{selectedPolicy.currentVersionNumber || 0}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-gray-300 transition hover:bg-white/5"
                    >
                      <Archive size={15} />
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/10"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>

                {metadata && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-gray-500">Title</span>
                      <input
                        value={metadata.title}
                        onChange={(event) => setMetadata((current) => ({ ...current, title: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-gray-500">Slug</span>
                      <input
                        value={metadata.slug}
                        onChange={(event) => setMetadata((current) => ({ ...current, slug: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-gray-500">Category</span>
                      <select
                        value={metadata.category}
                        onChange={(event) =>
                          setMetadata((current) => ({
                            ...current,
                            category: event.target.value,
                            controlsBookingRefunds:
                              event.target.value === 'refund'
                                ? current.controlsBookingRefunds
                                : false,
                          }))
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                      >
                        {categories.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-3 self-end rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-gray-300">
                      <input
                        type="checkbox"
                        checked={metadata.requiresAcceptance}
                        onChange={(event) => setMetadata((current) => ({ ...current, requiresAcceptance: event.target.checked }))}
                      />
                      Requires customer acceptance
                    </label>
                    {metadata.category === 'refund' && (
                      <label className="flex items-start gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] px-4 py-3 text-sm font-bold text-gray-200 lg:col-span-2">
                        <input
                          type="checkbox"
                          checked={metadata.controlsBookingRefunds}
                          onChange={(event) =>
                            setMetadata((current) => ({
                              ...current,
                              controlsBookingRefunds: event.target.checked,
                            }))
                          }
                          className="mt-1"
                        />
                        <span>
                          Control booking refunds
                          <span className="mt-1 block text-xs font-normal leading-5 text-gray-500">
                            The designated policy publishes legal text and executable refund rules as one immutable version.
                          </span>
                        </span>
                      </label>
                    )}
                    <label className="block lg:col-span-2">
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-gray-500">Description</span>
                      <textarea
                        value={metadata.description}
                        onChange={(event) => setMetadata((current) => ({ ...current, description: event.target.value }))}
                        className="min-h-20 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                      />
                    </label>
                    <div className="lg:col-span-2">
                      <button
                        type="button"
                        onClick={handleMetadataSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-gray-200 disabled:opacity-60"
                      >
                        <Save size={16} />
                        Save metadata
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-white/10 pt-6">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-black">Draft Editor</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedPolicy.controlsBookingRefunds
                          ? 'Policy text and executable refund rules stay editable in draft, then become immutable together when published.'
                          : 'Only draft versions can be edited. Publishing makes content immutable.'}
                      </p>
                    </div>
                    {!activeDraft && (
                      <button
                        type="button"
                        onClick={handleCreateNextDraft}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-2xl border border-yellow-400/30 px-4 py-2.5 text-sm font-black text-yellow-300 transition hover:bg-yellow-400/10"
                      >
                        <Plus size={16} />
                        Create next draft
                      </button>
                    )}
                  </div>

                  {!activeDraft || !draft ? (
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-gray-500">
                      No editable draft exists for this policy.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
                        <input
                          value={draft.title}
                          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                          className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                          placeholder="Version title"
                        />
                        <input
                          type="date"
                          value={draft.effectiveDate}
                          onChange={(event) => setDraft((current) => ({ ...current, effectiveDate: event.target.value }))}
                          className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                        />
                      </div>
                      <textarea
                        value={draft.summary}
                        onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                        className="min-h-20 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                        placeholder="Summary"
                      />
                      <textarea
                        value={draft.content}
                        onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                        className="min-h-[260px] w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm leading-7 outline-none focus:border-yellow-400"
                        placeholder="Policy content"
                      />
                      <input
                        value={draft.changeNote}
                        onChange={(event) => setDraft((current) => ({ ...current, changeNote: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-yellow-400"
                        placeholder="Change note"
                      />
                      {selectedPolicy.controlsBookingRefunds && (
                        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
                          <RefundRuleEditor
                            value={draft.refundRule}
                            onChange={(refundRule) => {
                              setDraft((current) => ({ ...current, refundRule }));
                              setDraftRuleErrors(validateRefundRule(refundRule));
                              setError('');
                            }}
                            errors={draftRuleErrors}
                          />
                          <RefundRulePreview
                            rule={draft.refundRule}
                            hasErrors={Object.keys(draftRuleErrors).length > 0}
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleDraftSave}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-gray-200 disabled:opacity-60"
                        >
                          <Save size={16} />
                          Save draft
                        </button>
                        <button
                          type="button"
                          onClick={handlePublish}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-300 disabled:opacity-60"
                        >
                          <Send size={16} />
                          {selectedPolicy.controlsBookingRefunds
                            ? 'Publish immutable text + rules'
                            : 'Publish immutable version'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="mb-4 font-black">Version History</h3>
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-black/50 text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Version</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Effective</th>
                          <th className="px-4 py-3">Accepted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {versions.map((version) => (
                          <tr key={version._id} className="text-gray-300">
                            <td className="px-4 py-3 font-bold">v{version.versionNumber}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(version.status)}`}>
                                {version.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">{formatDate(version.effectiveDate)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 text-emerald-300">
                                <CheckCircle2 size={14} />
                                {version.acceptanceCount || 0}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
