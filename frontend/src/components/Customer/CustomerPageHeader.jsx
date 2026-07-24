export default function CustomerPageHeader({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) {
  return (
    <header
      className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex min-w-0 items-center gap-4">
        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/10 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.12)]">
            <Icon aria-hidden="true" className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-[28px] font-black leading-tight tracking-[-0.03em] text-white sm:text-[32px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm font-medium leading-6 text-[#AFC2D8]/70">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && <div className="shrink-0 sm:self-center">{action}</div>}
    </header>
  );
}
