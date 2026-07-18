import { Fragment, useEffect, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Crown,
  RefreshCw,
  RotateCcw,
  WalletCards,
} from 'lucide-react';
import {
  getAdminBookingStatistics,
  getAdminSubscriptionStatistics,
  getViolationRevenueStatistics,
} from '../../services/statisticsService';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

const formatCurrency = (value) =>
  `${Number(value || 0).toLocaleString('vi-VN')} VND`;

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

const formatCompactCurrency = (value) =>
  new Intl.NumberFormat('vi-VN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const toDayKey = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const buildRevenueTimeline = (bookingTimeline, subscriptionTimeline, range) => {
  const pointsByPeriod = new Map();
  const ensurePoint = (period) => {
    const current = pointsByPeriod.get(period) || {
      period,
      bookingCharges: 0,
      bookingRefunds: 0,
      packageSales: 0,
      renewalSales: 0,
    };
    pointsByPeriod.set(period, current);
    return current;
  };

  for (const point of bookingTimeline?.points || []) {
    Object.assign(ensurePoint(point.period), point);
  }
  for (const point of subscriptionTimeline?.points || []) {
    Object.assign(ensurePoint(point.period), point);
  }

  if (range !== 'all') {
    const now = new Date();
    const days = range === '7d'
      ? 7
      : range === 'month'
        ? new Date().getDate() - 1
        : 30;
    for (let offset = days; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - offset);
      ensurePoint(toDayKey(date));
    }
  }

  return [...pointsByPeriod.values()]
    .sort((left, right) => left.period.localeCompare(right.period))
    .map((point) => {
      const recordedSales =
        Number(point.bookingCharges || 0) +
        Number(point.packageSales || 0) +
        Number(point.renewalSales || 0);
      const refunds = Number(point.bookingRefunds || 0);
      return {
        ...point,
        recordedSales,
        refunds,
        netSales: recordedSales - refunds,
      };
    });
};

export default function RevenueAnalytics() {
  const [range, setRange] = useState('30d');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [violations, setViolations] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getAdminBookingStatistics(range),
      getAdminSubscriptionStatistics(range),
      getViolationRevenueStatistics(range),
    ]).then((results) => {
      if (!active) return;
      const [bookingResult, subscriptionResult, violationResult] = results;
      const bookingResponse =
        bookingResult.status === 'fulfilled' ? bookingResult.value : null;
      const subscriptionResponse =
        subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null;
      const violationResponse =
        violationResult.status === 'fulfilled' ? violationResult.value : null;

      setBooking(
        bookingResponse?.ok && bookingResponse.data?.success
          ? bookingResponse.data.data
          : null
      );
      setSubscriptions(
        subscriptionResponse?.ok && subscriptionResponse.data?.success
          ? subscriptionResponse.data.data
          : null
      );
      setViolations(
        violationResponse?.ok && violationResponse.data?.success
          ? violationResponse.data.data
          : null
      );

      const statisticsUnavailable =
        bookingResponse?.status === 404 || subscriptionResponse?.status === 404;
      const allFailed =
        !bookingResponse?.ok && !subscriptionResponse?.ok && !violationResponse?.ok;
      setError(
        statisticsUnavailable
          ? 'Detailed booking and package analytics are currently disabled.'
          : allFailed
            ? 'Revenue data could not be loaded. Try again in a moment.'
            : ''
      );
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [range, refreshKey]);

  const handleRangeChange = (nextRange) => {
    if (nextRange === range) return;
    setLoading(true);
    setError('');
    setRange(nextRange);
  };

  const handleRefresh = () => {
    setLoading(true);
    setError('');
    setRefreshKey((value) => value + 1);
  };

  const bookingMoney = booking?.money || {};
  const bookingOperations = booking?.operational || {};
  const subscriptionSummary = subscriptions?.summary || {};
  const violationSummary = violations?.summary || {};
  const statusRows = booking?.byStatus || [];
  const packageRows = subscriptions?.byPackage || [];
  const maximumStatusCount = Math.max(
    ...statusRows.map((row) => Number(row.count || 0)),
    1
  );
  const revenueTimeline = buildRevenueTimeline(
    booking?.timeline,
    subscriptions?.timeline,
    range
  );

  return (
    <div className="mx-auto max-w-7xl p-6 text-gray-200 md:p-8">
      <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white lg:text-4xl">
            Revenue Analytics
          </h1>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-gray-400">
            Booking cash flow, refunds and parking package performance with each source
            kept separate.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Menu as="div" className="relative z-40 inline-block text-left">
            <Menu.Button className="inline-flex h-11 w-[156px] items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#111] px-3 text-sm text-white/70 shadow-sm transition-all hover:border-white/20 hover:bg-white/[0.02] hover:text-white focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30">
              <CalendarDays size={15} className="text-white/40" />
              <span className="font-medium">
                {RANGE_OPTIONS.find((option) => option.value === range)?.label}
              </span>
              <ChevronDown size={14} className="text-white/40" />
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Menu.Items className="absolute right-0 mt-2 w-44 origin-top-right overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-2xl shadow-black/60 backdrop-blur-xl focus:outline-none">
                <div className="p-1.5">
                  {RANGE_OPTIONS.map((option) => (
                    <Menu.Item key={option.value}>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={() => handleRangeChange(option.value)}
                          className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            active ? 'bg-white/10 text-white' : 'text-white/70'
                          }`}
                        >
                          {range === option.value ? (
                            <Check size={14} className="text-gold" />
                          ) : (
                            <span className="w-3.5" />
                          )}
                          {option.label}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-[#0B0E17] shadow-lg shadow-gold/20 transition hover:bg-gold/90 active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <RevenueSkeleton />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<WalletCards size={18} />}
              label="Wallet booking payments"
              value={formatCurrency(bookingMoney.walletBookingCharges)}
              note={`${formatNumber(bookingMoney.walletChargeCount)} recorded transactions`}
            />
            <Metric
              icon={<ArrowDownRight size={18} />}
              label="Booking refunds"
              value={formatCurrency(bookingMoney.walletBookingRefunds)}
              note={`${formatNumber(bookingMoney.walletRefundCount)} wallet refunds`}
              tone="negative"
            />
            <Metric
              icon={<CircleDollarSign size={18} />}
              label="Net wallet booking spend"
              value={formatCurrency(bookingMoney.walletNetBookingSpend)}
              note="Payments less booking refunds"
            />
            <Metric
              icon={<Crown size={18} />}
              label="Parking package value"
              value={formatCurrency(subscriptionSummary.grossAmount)}
              note={`${formatNumber(subscriptionSummary.sold)} packages in this period`}
            />
          </section>

          <p className="mt-3 text-xs leading-5 text-gray-500">
            These figures are not combined into one accounting revenue total. Booking values,
            wallet cash flow and package payments have different source coverage.
          </p>

          <SalesTrendChart
            points={revenueTimeline}
            granularity={booking?.timeline?.granularity || 'day'}
          />

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#181C23] shadow-sm">
              <SectionHeader
                title="Booking flow"
                description="Operational outcomes and recorded booking value."
              />
              <div className="grid gap-px bg-white/5 sm:grid-cols-3">
                <CompactMetric
                  label="Bookings"
                  value={formatNumber(bookingOperations.totalBookings)}
                  note={`${formatNumber(bookingOperations.completedBookings)} completed`}
                />
                <CompactMetric
                  label="Completion rate"
                  value={`${Number(bookingOperations.completionRate || 0)}%`}
                  note={`${formatNumber(bookingOperations.scheduledHours)} scheduled hours`}
                />
                <CompactMetric
                  label="Recorded booking value"
                  value={formatCurrency(bookingOperations.bookingValue)}
                  note="Domain value, not accounting revenue"
                />
              </div>
              <div className="space-y-4 p-5">
                {statusRows.length ? (
                  statusRows.map((row) => (
                    <div key={row.status}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                        <span className="font-bold text-gray-300">{row.status}</span>
                        <span className="text-gray-500">
                          {formatNumber(row.count)} bookings
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gold"
                          style={{
                            width: `${Math.max(
                              (Number(row.count || 0) / maximumStatusCount) * 100,
                              2
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No booking activity in this period." />
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#181C23] shadow-sm">
              <SectionHeader
                title="Package health"
                description="Current entitlement health with period sales."
              />
              <div className="grid grid-cols-2 gap-px bg-white/5">
                <CompactMetric
                  label="Active plans"
                  value={formatNumber(subscriptionSummary.active)}
                  note={`${formatNumber(subscriptionSummary.activeReservedSlots)} reserved spaces`}
                />
                <CompactMetric
                  label="Expiring soon"
                  value={formatNumber(subscriptionSummary.expiringWithin7Days)}
                  note="Within 7 days"
                />
                <CompactMetric
                  label="Renewals"
                  value={formatNumber(subscriptionSummary.renewalCount)}
                  note={`${Number(subscriptionSummary.renewalRate || 0)}% renewal rate`}
                />
                <CompactMetric
                  label="Violation revenue"
                  value={formatCurrency(violationSummary.totalAmount)}
                  note={`${formatNumber(violationSummary.count)} recorded payments`}
                />
              </div>
              <div className="p-5">
                <h3 className="mb-4 text-xs font-bold text-gray-400">Value by package</h3>
                <div className="space-y-3">
                  {packageRows.length ? (
                    packageRows.slice(0, 5).map((row) => (
                      <div
                        key={row.packageId || row.packageName}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#12161C] px-4 py-3 transition hover:border-gold/20"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {row.packageName || 'Archived package'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatNumber(row.sold)} sold, {formatNumber(row.slots)} spaces
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black tabular-nums text-gold">
                          {formatCurrency(row.amount)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No package payments in this period." />
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <SourceNote
              icon={<ArrowUpRight size={17} />}
              title="External booking value"
              value={formatCurrency(bookingMoney.externalPaymentValue)}
              text="Estimated from paid booking records."
            />
            <SourceNote
              icon={<RotateCcw size={17} />}
              title="Renewal value"
              value={formatCurrency(subscriptionSummary.renewalAmount)}
              text="Successful renewals recorded by the new audit flow."
            />
            <SourceNote
              icon={<BarChart3 size={17} />}
              title="Coverage"
              value={bookingMoney.financialCoverage || 'Unavailable'}
              text="Wallet totals require a verified booking reference."
            />
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value, note, tone = 'default' }) {
  return (
    <div className="group rounded-3xl border border-white/10 bg-[#181C23] p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          tone === 'negative'
            ? 'bg-rose-400/10 text-rose-300'
            : 'bg-gold/10 text-gold'
        }`}
      >
        {icon}
      </div>
      <p className="mt-5 text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-black tabular-nums tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{note}</p>
    </div>
  );
}

function CompactMetric({ label, value, note }) {
  return (
    <div className="bg-[#181C23] p-5">
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-black tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-600">{note}</p>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="border-b border-white/5 px-6 py-5">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
    </div>
  );
}

function SourceNote({ icon, title, value, text }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-white/5 bg-[#181C23] p-5 shadow-sm">
      <div className="mt-0.5 text-gold">{icon}</div>
      <div>
        <p className="text-xs font-bold text-gray-500">{title}</p>
        <p className="mt-1 text-sm font-black tabular-nums capitalize text-white">{value}</p>
        <p className="mt-1 text-xs leading-5 text-gray-600">{text}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-7 text-center text-xs text-gray-500">
      {text}
    </div>
  );
}

function SalesTrendChart({ points, granularity }) {
  const width = 1000;
  const height = 300;
  const padding = { top: 24, right: 28, bottom: 42, left: 82 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maximumValue = Math.max(
    ...points.flatMap((point) => [point.recordedSales, point.refunds]),
    1
  );
  const xForIndex = (index) =>
    padding.left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const yForValue = (value) =>
    padding.top + plotHeight - (Number(value || 0) / maximumValue) * plotHeight;
  const makePath = (field) =>
    points
      .map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${xForIndex(index).toFixed(2)} ${yForValue(point[field]).toFixed(2)}`;
      })
      .join(' ');
  const labelIndexes = new Set(
    [0, Math.floor((points.length - 1) / 2), points.length - 1].filter(
      (index) => index >= 0
    )
  );
  const hasActivity = points.some(
    (point) => point.recordedSales > 0 || point.refunds > 0
  );
  const totalRecordedSales = points.reduce(
    (sum, point) => sum + point.recordedSales,
    0
  );
  const totalRefunds = points.reduce((sum, point) => sum + point.refunds, 0);

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-white/5 bg-[#181C23] shadow-sm">
      <div className="flex flex-col gap-4 border-b border-white/5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Sales trend</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Recorded booking payments, package sales and renewals over time.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <span className="flex items-center gap-2 text-gray-400">
            <span className="h-0.5 w-5 bg-gold" />
            Recorded sales {formatCurrency(totalRecordedSales)}
          </span>
          <span className="flex items-center gap-2 text-gray-400">
            <span className="h-0.5 w-5 bg-rose-400" />
            Refunds {formatCurrency(totalRefunds)}
          </span>
        </div>
      </div>

      {hasActivity ? (
        <div className="overflow-x-auto px-3 pb-3 pt-5 sm:px-5">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="min-w-[720px] w-full"
            role="img"
            aria-label="Line chart showing recorded sales and refunds over time"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + plotHeight * ratio;
              const value = maximumValue * (1 - ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    fill="rgba(156,163,175,0.72)"
                    fontSize="12"
                  >
                    {formatCompactCurrency(value)}
                  </text>
                </g>
              );
            })}

            <path
              d={makePath('recordedSales')}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={makePath('refunds')}
              fill="none"
              stroke="#FB7185"
              strokeWidth="3"
              strokeDasharray="8 8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, index) => (
              <g key={point.period}>
                {point.recordedSales > 0 && (
                  <circle
                    cx={xForIndex(index)}
                    cy={yForValue(point.recordedSales)}
                    r="4.5"
                    fill="#181C23"
                    stroke="#D4AF37"
                    strokeWidth="3"
                  >
                    <title>
                      {`${point.period}: recorded sales ${formatCurrency(point.recordedSales)}`}
                    </title>
                  </circle>
                )}
                {point.refunds > 0 && (
                  <circle
                    cx={xForIndex(index)}
                    cy={yForValue(point.refunds)}
                    r="4"
                    fill="#181C23"
                    stroke="#FB7185"
                    strokeWidth="2.5"
                  >
                    <title>
                      {`${point.period}: refunds ${formatCurrency(point.refunds)}`}
                    </title>
                  </circle>
                )}
                {labelIndexes.has(index) && (
                  <text
                    x={xForIndex(index)}
                    y={height - 12}
                    textAnchor={
                      index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'
                    }
                    fill="rgba(156,163,175,0.78)"
                    fontSize="12"
                  >
                    {granularity === 'month'
                      ? point.period
                      : new Date(`${point.period}T00:00:00+07:00`).toLocaleDateString(
                        'vi-VN',
                        { day: '2-digit', month: '2-digit' }
                      )}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <div className="px-6 py-12">
          <EmptyState text="No recorded sales or refunds in this period." />
        </div>
      )}
    </section>
  );
}

function RevenueSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading revenue analytics">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-48 animate-pulse rounded-3xl bg-white/[0.05]" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="h-96 animate-pulse rounded-3xl bg-white/[0.05]" />
        <div className="h-96 animate-pulse rounded-3xl bg-white/[0.05]" />
      </div>
    </div>
  );
}
