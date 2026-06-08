import { useMemo } from "react";
import { Zap, CheckCircle2, ShieldCheck, Bell, Mail } from "lucide-react";

const AVAILABLE_CHANNELS = ["In-app", "Email", "SMS", "Push"];

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
          <div key={groupName} className="rounded-3xl border border-gray-700/60 bg-gray-900/70 p-5">
            <div className="flex items-center gap-3 border-b border-gray-700/50 pb-4 text-white">
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
                  className="rounded-3xl border border-gray-700/80 bg-gray-950/50 p-4"
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr_0.7fr] lg:items-center">
                    <div className="space-y-2">
                      <p className="font-semibold text-white">{rule.name}</p>
                      <p className="text-sm text-gray-400">Key: {rule.eventKey}</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
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
                                ? "border-sky-400 bg-sky-500/10 text-sky-100"
                                : "border-gray-700 bg-gray-900 text-gray-400 hover:border-sky-500/20"
                            }`}
                          >
                            {channel}
                          </button>
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                        <div className="rounded-2xl border border-gray-700/80 bg-gray-900 px-3 py-2">
                          <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Throttle (phút)</label>
                          <input
                            type="number"
                            min={1}
                            value={rule.throttleMinutes}
                            onChange={(event) =>
                              onUpdate(rule.eventKey, {
                                throttleMinutes: Number(event.target.value) || 1,
                              })
                            }
                            className="mt-2 w-full rounded-2xl bg-transparent text-sm text-gray-100 outline-none"
                          />
                        </div>
                        <div className="rounded-2xl border border-gray-700/80 bg-gray-900 px-3 py-2">
                          <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Trạng thái</label>
                          <button
                            type="button"
                            onClick={() => onUpdate(rule.eventKey, { enabled: !rule.enabled })}
                            className={`mt-2 inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                              rule.enabled
                                ? "bg-emerald-500 text-black"
                                : "bg-gray-700 text-gray-200"
                            }`}
                          >
                            {rule.enabled ? "Bật" : "Tắt"}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 items-start lg:items-end">
                      <button
                        type="button"
                        onClick={() => onTest(rule.eventKey, { message: "Kiểm tra quy tắc tự động." })}
                        className="inline-flex items-center gap-2 rounded-3xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-400"
                      >
                        <Zap size={16} />
                        Test
                      </button>
                      <p className="text-xs text-gray-500">
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
