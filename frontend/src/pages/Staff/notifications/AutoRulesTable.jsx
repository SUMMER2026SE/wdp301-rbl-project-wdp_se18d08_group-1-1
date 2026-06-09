import { useMemo } from "react";
import { Zap, CheckCircle2, ShieldCheck, Bell, Mail } from "lucide-react";

const AVAILABLE_CHANNELS = ["In-app", "Email"];

function eventIcon(group) {
  switch (group) {
    case "Tài khoản":
      return <ShieldCheck size={16} />;
    case "Ví":
      return <CheckCircle2 size={16} />;
    case "Đặt chỗ":
      return <Bell size={16} />;
    case "Đỗ xe":
      return <Zap size={16} />;
    default:
      return <Mail size={16} />;
  }
}

export default function AutoRulesTable({ rules, onUpdate, onTest }) {
  const grouped = useMemo(() => {
    return rules.reduce((acc, rule) => {
      acc[rule.group] = acc[rule.group] || [];
      acc[rule.group].push(rule);
      return acc;
    }, {});
  }, [rules]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-sky-400 uppercase tracking-[0.2em] font-semibold">
            Quy tắc tự động
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Cấu hình hành vi tự động</h2>
          <p className="mt-2 text-sm text-gray-400 max-w-2xl">
            Bật/tắt quy tắc, chọn kênh gửi, điều chỉnh throttle để chống spam và kiểm tra trigger ngay.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([groupName, groupRules]) => (
          <div key={groupName} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 border-b border-border pb-4 text-white">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-200">
                {eventIcon(groupName)}
              </span>
              <div>
                <p className="text-lg font-semibold">{groupName}</p>
                <p className="text-sm text-gray-400">Các sự kiện tự động thuộc nhóm {groupName}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {groupRules.map((rule) => (
                <div
                  key={rule.eventKey}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    {/* Toggle on left */}
                    <button
                      type="button"
                      onClick={() => onUpdate(rule.eventKey, { enabled: !rule.enabled })}
                      aria-pressed={rule.enabled}
                      className={`relative w-14 h-8 rounded-full transition-colors focus:outline-none flex-shrink-0 ${
                        rule.enabled ? "bg-success" : "bg-secondary"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-background shadow-md transform transition-transform ${
                          rule.enabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">{rule.name}</p>
                              <p className="text-sm text-muted-foreground">Key: {rule.eventKey}</p>
                            </div>
                            <div className="text-xs px-3 py-2 rounded border border-border text-muted-foreground bg-white/5">
                              Throttle: <span className="font-medium">{rule.throttleMinutes ?? '—'}p</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {AVAILABLE_CHANNELS.map((channel) => (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => {
                              const active = rule.channels.includes(channel);
                              const nextChannels = active
                                ? rule.channels.filter((item) => item !== channel)
                                : [...rule.channels, channel];
                              onUpdate(rule.eventKey, { channels: nextChannels });
                            }}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              rule.channels.includes(channel)
                                ? "border-success bg-success/15 text-success"
                                : "border-border bg-card text-muted-foreground hover:border-success/40"
                            }`}
                          >
                            {channel}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => onTest(rule.eventKey, { message: "Kiểm tra quy tắc tự động." })}
                        className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white hover:bg-sky-400"
                      >
                        <Zap size={16} />
                      </button>
                      <p className="text-xs text-muted-foreground">
                        Lần kích hoạt cuối: {rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleString("vi-VN") : "Chưa có"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
