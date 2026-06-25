import { useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";

const PRIORITIES = ["INFO", "SUCCESS", "WARNING", "ERROR", "SYSTEM"];
const CHANNELS = ["In-app", "Email"];

const emptyRule = {
  eventKey: "",
  group: "System",
  name: "",
  description: "",
  priority: "INFO",
  enabled: true,
  channels: ["In-app", "Email"],
  throttleMinutes: 10,
};

const RULE_COPY = {
  "account.registered": {
    group: "Account",
    name: "Registration successful",
    description: "When a user creates a new account.",
  },
  "account.email_verified": {
    group: "Account",
    name: "Email verified successfully",
    description: "When a user verifies their email.",
  },
  "account.password_changed": {
    group: "Account",
    name: "Password changed",
    description: "Security notification for every password change.",
  },
  "account.locked": {
    group: "Account",
    name: "Account locked",
    description: "When an account is locked by an admin.",
  },
  "account.unlocked": {
    group: "Account",
    name: "Account unlocked",
    description: "When an account is unlocked by an admin.",
  },
  "wallet.topup_success": {
    group: "Wallet",
    name: "Top-up successful",
    description: "When a wallet top-up succeeds.",
  },
  "wallet.topup_failed": {
    group: "Wallet",
    name: "Top-up failed",
    description: "When a top-up transaction fails.",
  },
  "wallet.payment_success": {
    group: "Wallet",
    name: "Payment successful",
    description: "When parking fee payment succeeds.",
  },
  "wallet.payment_failed": {
    group: "Wallet",
    name: "Payment failed",
    description: "When payment fails due to insufficient balance.",
  },
  "wallet.refund_success": {
    group: "Wallet",
    name: "Refund successful",
    description: "When a wallet refund succeeds.",
  },
  "wallet.low_balance": {
    group: "Wallet",
    name: "Low balance",
    description: "When wallet balance is below 30,000 VND.",
  },
  "parking.entry": {
    group: "Parking",
    name: "Vehicle entry",
    description: "When a vehicle is recorded entering the parking lot.",
  },
  "parking.exit": {
    group: "Parking",
    name: "Vehicle exit",
    description: "When a vehicle leaves the parking lot.",
  },
  "parking.remaining_30": {
    group: "Parking",
    name: "30 minutes left",
    description: "Warn when a parking session has 30 minutes left.",
  },
  "parking.remaining_15": {
    group: "Parking",
    name: "15 minutes left",
    description: "Warn when a parking session has 15 minutes left.",
  },
  "parking.remaining_5": {
    group: "Parking",
    name: "5 minutes left",
    description: "Urgent warning when a parking session has 5 minutes left.",
  },
  "parking.expired": {
    group: "Parking",
    name: "Parking time expired",
    description: "The parking session has expired.",
  },
  "booking.checkin_overdue": {
    group: "Booking",
    name: "Check-in overdue",
    description: "When a customer misses the booking check-in time.",
  },
  "booking.created": {
    group: "Booking",
    name: "Booking successful",
    description: "When a new booking is created successfully.",
  },
  "booking.cancelled": {
    group: "Booking",
    name: "Booking cancelled",
    description: "When a booking is cancelled.",
  },
  "system.maintenance": {
    group: "System",
    name: "System maintenance",
    description: "System maintenance notice for all users.",
  },
  "system.update": {
    group: "System",
    name: "Version update",
    description: "New version notice.",
  },
};

function eventIcon(group = "") {
  const normalized = group.toLowerCase();
  if (normalized.includes("account")) return <ShieldCheck size={16} />;
  if (normalized.includes("wallet")) return <CheckCircle2 size={16} />;
  if (normalized.includes("parking")) return <Zap size={16} />;
  if (normalized.includes("booking")) return <Bell size={16} />;
  if (normalized.includes("system")) return <Mail size={16} />;
  return <Bell size={16} />;
}

function normalizeChannels(channels) {
  const safe = Array.isArray(channels) ? channels.filter((channel) => CHANNELS.includes(channel)) : [];
  return [...new Set(["In-app", ...safe])];
}

function slugifyEventKey(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function normalizeRuleCopy(rule) {
  const copy = RULE_COPY[rule.eventKey];
  return copy ? { ...rule, ...copy } : rule;
}

export default function AutoRulesTable({
  rules = [],
  loading = false,
  accent = "emerald",
  onUpdate,
  onCreate,
  onSave,
  onDelete,
  onTest,
}) {
  const [query, setQuery] = useState("");
  const [editingRule, setEditingRule] = useState(null);
  const [deletingRule, setDeletingRule] = useState(null);
  const [busyKey, setBusyKey] = useState("");

  const theme =
    accent === "yellow"
      ? {
          text: "text-yellow-300",
          border: "border-yellow-500/30",
          bg: "bg-yellow-500/10",
          button: "bg-yellow-500 text-black hover:bg-yellow-400",
          ghost: "border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10",
        }
      : {
          text: "text-emerald-300",
          border: "border-emerald-500/30",
          bg: "bg-emerald-500/10",
          button: "bg-emerald-500 text-white hover:bg-emerald-400",
          ghost: "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10",
        };

  const filteredRules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const normalizedRules = rules.map(normalizeRuleCopy);
    if (!needle) return normalizedRules;
    return normalizedRules.filter((rule) =>
      [rule.group, rule.name, rule.description, rule.eventKey, rule.priority]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [query, rules]);

  const grouped = useMemo(() => {
    return filteredRules.reduce((acc, rule) => {
      const group = rule.group || "Other";
      acc[group] = acc[group] || [];
      acc[group].push(rule);
      return acc;
    }, {});
  }, [filteredRules]);

  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const disabledCount = Math.max(0, rules.length - enabledCount);
  const groupCount = Object.keys(grouped).length;

  const runAction = async (key, action) => {
    setBusyKey(key);
    try {
      await action();
    } finally {
      setBusyKey("");
    }
  };

  const toggleEnabled = (rule) => {
    runAction(`toggle-${rule.eventKey}`, () => onUpdate(rule.eventKey, { enabled: !rule.enabled }));
  };

  const toggleChannel = (rule, channel) => {
    const channels = normalizeChannels(rule.channels);
    const nextChannels = channels.includes(channel)
      ? channels.filter((item) => item !== channel)
      : [...channels, channel];

    runAction(`channel-${rule.eventKey}-${channel}`, () =>
      onUpdate(rule.eventKey, { channels: normalizeChannels(nextChannels) })
    );
  };

  const saveRule = async (rule) => {
    const payload = {
      ...rule,
      eventKey: slugifyEventKey(rule.eventKey),
      group: rule.group.trim(),
      name: rule.name.trim(),
      description: rule.description.trim(),
      channels: normalizeChannels(rule.channels),
      throttleMinutes: Math.max(1, Number(rule.throttleMinutes) || 1),
    };

    const ok = rule._id ? await onSave(rule.eventKey, payload) : await onCreate(payload);
    if (ok) setEditingRule(null);
  };

  const confirmDelete = async () => {
    if (!deletingRule) return;
    const ok = await onDelete(deletingRule.eventKey);
    if (ok) setDeletingRule(null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#151515] p-6 text-sm text-gray-400">
        <Loader2 className="animate-spin" size={16} />
        Loading automation rules...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-white/5 bg-[#151515] p-5 shadow-lg shadow-black/10">
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0">
            <h2 className="text-xl font-bold text-white">Automation Rules</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
              Create reusable triggers for system, account, wallet, parking, and booking notifications.
            </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto xl:justify-end">
              <div className="relative sm:min-w-[360px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search rules"
                  className="h-11 w-full rounded-lg border border-white/10 bg-[#0D0D0D] pl-9 pr-3 text-sm text-white outline-none transition focus:border-emerald-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setEditingRule({ ...emptyRule })}
                className={`inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold ${theme.button}`}
              >
                <Plus size={16} />
                Add Rule
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryPill label="Active Rules" value={enabledCount} tone="emerald" />
            <SummaryPill label="Disabled Rules" value={disabledCount} tone="gray" />
            <SummaryPill label="Rule Groups" value={groupCount} tone="sky" />
          </div>
        </div>
      </section>

      {!filteredRules.length ? (
        <div className="rounded-xl border border-white/5 bg-[#151515] p-10 text-center text-sm text-gray-500">
          No automation rules match your search.
        </div>
      ) : (
        Object.entries(grouped).map(([groupName, groupRules]) => (
          <section key={groupName} className="overflow-hidden rounded-xl border border-white/5 bg-[#151515]">
            <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
              <span className={`grid h-10 w-10 place-items-center rounded-xl border ${theme.border} ${theme.bg} ${theme.text}`}>
                {eventIcon(groupName)}
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">{groupName}</h3>
                <p className="text-xs text-gray-500">{groupRules.length} configured rules</p>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {groupRules.map((rule) => {
                const channels = normalizeChannels(rule.channels);
                const busy = busyKey.includes(rule.eventKey);

                return (
                  <article key={rule.eventKey} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEnabled(rule)}
                          disabled={busy}
                          className={`relative h-7 w-12 rounded-full transition disabled:opacity-60 ${rule.enabled ? "bg-emerald-500" : "bg-gray-700"}`}
                          aria-pressed={Boolean(rule.enabled)}
                        >
                          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${rule.enabled ? "left-6" : "left-1"}`} />
                        </button>
                        <h4 className="max-w-full truncate text-base font-semibold text-white">{rule.name}</h4>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-gray-500">{rule.priority || "INFO"}</span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-500">{rule.eventKey}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-gray-400">{rule.description || "No description."}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {CHANNELS.map((channel) => (
                          <button
                            key={channel}
                            type="button"
                            disabled={channel === "In-app" || busy}
                            onClick={() => toggleChannel(rule, channel)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                              channels.includes(channel)
                                ? `${theme.border} ${theme.bg} ${theme.text}`
                                : "border-white/10 text-gray-500 hover:bg-white/5"
                            }`}
                          >
                            {channel}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-gray-400">
                        <Timer size={14} />
                        {rule.throttleMinutes || 0} min
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingRule({ ...rule, channels })}
                        className={`grid h-10 w-10 place-items-center rounded-lg border ${theme.ghost}`}
                        aria-label="Edit rule"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingRule(rule)}
                        className="grid h-10 w-10 place-items-center rounded-lg border border-red-500/25 text-red-300 hover:bg-red-500/10"
                        aria-label="Delete rule"
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runAction(`test-${rule.eventKey}`, () => onTest(rule.eventKey))}
                        className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:opacity-60 ${theme.button}`}
                      >
                        {busyKey === `test-${rule.eventKey}` ? <Loader2 className="animate-spin" size={15} /> : <Zap size={15} />}
                        Test
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      {editingRule && (
        <RuleModal
          rule={editingRule}
          theme={theme}
          onClose={() => setEditingRule(null)}
          onChange={setEditingRule}
          onSave={saveRule}
        />
      )}

      {deletingRule && (
        <ConfirmDeleteModal
          rule={deletingRule}
          theme={theme}
          onClose={() => setDeletingRule(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function RuleModal({ rule, theme, onChange, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(rule._id);
  const valid = slugifyEventKey(rule.eventKey) && rule.group.trim() && rule.name.trim();

  const update = (field, value) => onChange({ ...rule, [field]: value });
  const toggleChannel = (channel) => {
    if (channel === "In-app") return;
    const channels = normalizeChannels(rule.channels);
    const nextChannels = channels.includes(channel)
      ? channels.filter((item) => item !== channel)
      : [...channels, channel];
    update("channels", normalizeChannels(nextChannels));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!valid) return;
    setSaving(true);
    await onSave(rule);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#151515] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-white">{isEdit ? "Edit Automation Rule" : "Add Automation Rule"}</h3>
            <p className="mt-1 text-sm text-gray-500">Use clear English copy so staff can scan rules quickly.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-gray-400 hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="Event key">
            <input
              value={rule.eventKey}
              onChange={(event) => update("eventKey", slugifyEventKey(event.target.value))}
              disabled={isEdit}
              placeholder="system.maintenance"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:text-gray-500"
            />
          </Field>
          <Field label="Group">
            <input
              value={rule.group}
              onChange={(event) => update("group", event.target.value)}
              placeholder="System"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 text-sm text-white outline-none"
            />
          </Field>
          <Field label="Name">
            <input
              value={rule.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="System maintenance"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 text-sm text-white outline-none"
            />
          </Field>
          <Field label="Priority">
            <select
              value={rule.priority}
              onChange={(event) => update("priority", event.target.value)}
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 text-sm text-white outline-none"
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Throttle minutes">
            <input
              type="number"
              min="1"
              value={rule.throttleMinutes}
              onChange={(event) => update("throttleMinutes", event.target.value)}
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0D0D0D] px-3 text-sm text-white outline-none"
            />
          </Field>
          <Field label="Status">
            <button
              type="button"
              onClick={() => update("enabled", !rule.enabled)}
              className={`inline-flex h-11 w-full items-center justify-between rounded-lg border px-3 text-sm font-semibold ${
                rule.enabled ? `${theme.border} ${theme.bg} ${theme.text}` : "border-white/10 text-gray-400"
              }`}
            >
              {rule.enabled ? "Enabled" : "Disabled"}
              <span className={`relative h-6 w-11 rounded-full ${rule.enabled ? "bg-emerald-500" : "bg-gray-700"}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${rule.enabled ? "left-6" : "left-1"}`} />
              </span>
            </button>
          </Field>
          <Field label="Description">
            <textarea
              value={rule.description}
              onChange={(event) => update("description", event.target.value)}
              rows={4}
              placeholder="Describe when this notification should run."
              className="w-full resize-none rounded-lg border border-white/10 bg-[#0D0D0D] px-3 py-3 text-sm text-white outline-none"
            />
          </Field>
          <Field label="Channels">
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((channel) => {
                const active = normalizeChannels(rule.channels).includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    disabled={channel === "In-app"}
                    onClick={() => toggleChannel(channel)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-75 ${
                      active ? `${theme.border} ${theme.bg} ${theme.text}` : "border-white/10 text-gray-500 hover:bg-white/5"
                    }`}
                  >
                    {channel}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/5 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-white/10 px-4 text-sm font-semibold text-gray-300 hover:bg-white/5">
            Cancel
          </button>
          <button type="submit" disabled={!valid || saving} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${theme.button}`}>
            {saving ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
            Save Rule
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDeleteModal({ rule, theme, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-300">
            <Trash2 size={18} />
          </span>
          <div>
            <h3 className="text-lg font-bold text-white">Delete Automation Rule</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Delete <span className="font-semibold text-white">{rule.name}</span>? This removes the automated trigger from the rule list.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-white/10 px-4 text-sm font-semibold text-gray-300 hover:bg-white/5">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ label, value, tone }) {
  const toneClass = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    gray: "border-white/10 bg-white/[0.03] text-gray-300",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  }[tone];

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block sm:col-span-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
