const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

export default function PolicyContent({ policy, version }) {
  if (!policy || !version) {
    return null;
  }

  const paragraphs = String(version.content || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto w-full max-w-3xl">
      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-gold">
          {policy.category?.replace(/_/g, ' ') || 'Policy'}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-950 md:text-5xl">
          {version.title || policy.title}
        </h1>
        {version.summary && (
          <p className="mt-4 text-base leading-7 text-gray-600">{version.summary}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1">
            Version {version.versionNumber}
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1">
            Effective {formatDate(version.effectiveDate)}
          </span>
        </div>
      </div>

      <div className="space-y-5 text-[15px] leading-8 text-gray-700">
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 20)}`} className="whitespace-pre-wrap break-words">
            {paragraph}
          </p>
        ))}
      </div>

      {version.changeNote && (
        <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-black">Change note:</span> {version.changeNote}
        </div>
      )}
    </article>
  );
}
