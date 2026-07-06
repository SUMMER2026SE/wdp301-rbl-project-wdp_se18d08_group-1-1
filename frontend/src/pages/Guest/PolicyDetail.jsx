import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import PolicyAcceptancePrompt from '../../components/policies/PolicyAcceptancePrompt';
import PolicyContent from '../../components/policies/PolicyContent';
import {
  getPolicyBySlug,
  getPolicyVersion,
} from '../../services/policyService';

export default function PolicyDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionData, setVersionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [versionLoading, setVersionLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptOpen, setAcceptOpen] = useState(false);

  const user = useMemo(() => {
    const raw = sessionStorage.getItem('valo_user');
    return raw ? JSON.parse(raw) : null;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    getPolicyBySlug(slug)
      .then((res) => {
        if (res.ok && res.data?.success) {
          setData(res.data.data);
          setSelectedVersion(res.data.data.policy?.currentVersionNumber);
        } else {
          setError(res.data?.message || 'Policy not found.');
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!data || !selectedVersion) return undefined;

    const currentVersion = data.policy?.currentVersion;
    if (Number(selectedVersion) === Number(data.policy?.currentVersionNumber)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVersionData(currentVersion);
      return undefined;
    }

    let cancelled = false;
    setVersionLoading(true);
    getPolicyVersion(slug, selectedVersion)
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data?.success) {
          setVersionData(res.data.data.version);
        }
      })
      .finally(() => {
        if (!cancelled) setVersionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [data, selectedVersion, slug]);

  const policy = data?.policy;
  const isCurrentVersion = Number(selectedVersion) === Number(policy?.currentVersionNumber);
  const canAccept = user?.role === 'customer' && policy?.requiresAcceptance && isCurrentVersion;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-6 pt-32">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 rounded-3xl border border-gray-200 bg-white py-20 text-sm font-bold text-gray-500">
          <Loader2 size={18} className="animate-spin" />
          Loading policy
        </div>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-6 pt-32">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
          {error || 'Policy not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <Link
            to="/policies"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to policies
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {data.versions?.length > 1 && (
              <select
                value={selectedVersion || ''}
                onChange={(event) => setSelectedVersion(event.target.value)}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 outline-none focus:border-gold"
              >
                {data.versions.map((version) => (
                  <option key={version.versionNumber} value={version.versionNumber}>
                    Version {version.versionNumber}
                  </option>
                ))}
              </select>
            )}
            {canAccept && (
              <button
                type="button"
                onClick={() => setAcceptOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-black"
              >
                <CheckCircle2 size={16} />
                Accept latest version
              </button>
            )}
          </div>
        </div>

        {versionLoading ? (
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 rounded-3xl border border-gray-200 bg-white py-20 text-sm font-bold text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Loading version
          </div>
        ) : (
          <PolicyContent policy={policy} version={versionData || policy.currentVersion} />
        )}
      </div>

      <PolicyAcceptancePrompt
        open={acceptOpen}
        missingPolicies={[
          {
            policyId: policy._id,
            slug: policy.slug,
            title: policy.currentVersion?.title || policy.title,
            versionNumber: policy.currentVersionNumber,
          },
        ]}
        onClose={() => setAcceptOpen(false)}
        onAccepted={() => setAcceptOpen(false)}
      />
    </div>
  );
}
