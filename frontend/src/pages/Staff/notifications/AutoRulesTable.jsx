import { useMemo } from "react";
import { Bell, CheckCircle2, Loader2, Mail, ShieldCheck, Timer, Zap } from "lucide-react";

const AVAILABLE_CHANNELS = ["Email"];

function eventIcon(group = "") {
  const normalized = group.toLowerCase();
  if (normalized.includes("account") || normalized.includes("tài khoản")) return <ShieldCheck size={16} />;
  if (normalized.includes("wallet") || normalized.includes("ví")) return <CheckCircle2 size={16} />;
  if (normalized.includes("parking") || normalized.includes("đỗ xe")) return <Zap size={16} />;
  if (normalized.includes("system") || normalized.includes("hệ thống")) return <Mail size={16} />;
  return <Bell size={16} />;
}

export default function AutoRulesTable({ rules = [], loading = false, accent = "emerald", onUpdate, onTest }) {
  const theme =
    accent === "yellow"
      ? {
          text: "text-yellow-300",
          border: "border-yellow-500/30",
          bg: "bg-yellow-500/10",
          button: "bg-yellow-500 text-black hover:bg-yellow-400",
        }
      : {
          text: "text-emerald-300",
          border: "border-emerald-500/30",
          bg: "bg-emerald-500/10",
          button: "bg-emerald-500 text-white hover:bg-emerald-400",
        };

  const grouped = useMemo(() => {
    return rules.reduce((acc, rule) => {
      const group = rule.group || "Khác";
      acc[group] = acc[group] || [];
      acc[group].push(rule);
      return acc;
    }, {});
  }, [rules]);

  const toggleChannel = (rule, channel) => {
    const channels = Array.isArray(rule.channels) && rule.channels.length ? rule.channels : ["In-app"];
    const nextChannels = channels.includes(channel)
      ? channels.filter((item) => item !== channel)
      : [...channels, channel];

    onUpdate(rule.eventKey, { channels: nextChannels.includes("In-app") ? nextChannels : ["In-app", ...nextChannels] });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#151515] p-6 text-sm text-gray-400">
        <Loader2 className="animate-spin" size={16} />
        Đang tải luật tự động...
      </div>
    );
  }

  if (!rules.length) {
    return <div className="rounded-xl border border-white/5 bg-[#151515] p-10 text-center text-sm text-gray-500">Chưa có luật tự động.</div>;
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([groupName, groupRules]) => (
        <section key={groupName} className="overflow-hidden rounded-xl border border-white/5 bg-[#151515]">
          <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
            <span className={`grid h-10 w-10 place-items-center rounded-xl border ${theme.border} ${theme.bg} ${theme.text}`}>
              {eventIcon(groupName)}
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">{groupName}</h2>
              <p className="text-xs text-gray-500">{groupRules.length} luật đang được cấu hình</p>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {groupRules.map((rule) => {
              const channels = Array.isArray(rule.channels) && rule.channels.length ? rule.channels : ["In-app"];

              return (
                <article key={rule.eventKey} className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdate(rule.eventKey, { enabled: !rule.enabled })}
                        className={`relative h-7 w-12 rounded-full transition ${rule.enabled ? "bg-emerald-500" : "bg-gray-700"}`}
                        aria-pressed={Boolean(rule.enabled)}
                      >
                        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${rule.enabled ? "left-6" : "left-1"}`} />
                      </button>
                      <h3 className="truncate text-sm font-semibold text-white">{rule.name}</h3>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-gray-500">{rule.priority || "INFO"}</span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-gray-500">{rule.eventKey}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">{rule.description || "Không có mô tả."}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`${rule.enabled ? `${theme.border} ${theme.bg} ${theme.text}` : "border-white/10 text-gray-500"} rounded-full border px-3 py-1 text-xs font-semibold`}>
                        In-app
                      </span>
                      {AVAILABLE_CHANNELS.map((channel) => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => toggleChannel(rule, channel)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
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

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-gray-400">
                      <Timer size={14} />
                      {rule.throttleMinutes || 0} phút
                    </span>
                    <button type="button" onClick={() => onTest(rule.eventKey)} className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${theme.button}`}>
                      <Zap size={15} />
                      Test
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
