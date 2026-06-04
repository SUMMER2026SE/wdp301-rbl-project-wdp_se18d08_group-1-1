import { useMemo, useState } from "react";
import {
  Bell,
  Send,
  Calendar,
  FileText,
  Zap,
  Users,
  Globe,
} from "lucide-react";
import { useNotificationStore } from "../../lib/notifications/store";
import LiveFeed from "./notifications/LiveFeed";
import ComposeForm from "./notifications/ComposeForm";
import ScheduledList from "./notifications/ScheduledList";
import TemplateManager from "./notifications/TemplateManager";
import AutoRulesTable from "./notifications/AutoRulesTable";
import { PRIORITY_META } from "../../lib/notifications/types";

const TABS = [
  { key: "live", label: "Phát sóng trực tiếp", icon: Bell },
  { key: "compose", label: "Soạn (Gửi thông báo)", icon: Send },
  { key: "schedule", label: "Lịch trình", icon: Calendar },
  { key: "templates", label: "Mẫu", icon: FileText },
  { key: "rules", label: "Quy tắc tự động", icon: Zap },
];

export default function NotificationManagement() {
  const [activeTab, setActiveTab] = useState("live");
  const notifications = useNotificationStore((state) => state.notifications);
  const scheduled = useNotificationStore((state) => state.scheduled);
  const templates = useNotificationStore((state) => state.templates);
  const autoRules = useNotificationStore((state) => state.autoRules);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const scheduleNotification = useNotificationStore(
    (state) => state.scheduleNotification,
  );
  const removeScheduled = useNotificationStore((state) => state.removeScheduled);
  const addTemplate = useNotificationStore((state) => state.addTemplate);
  const updateTemplate = useNotificationStore((state) => state.updateTemplate);
  const deleteTemplate = useNotificationStore((state) => state.deleteTemplate);
  const updateAutoRule = useNotificationStore((state) => state.updateAutoRule);
  const triggerAutoEvent = useNotificationStore((state) => state.triggerAutoEvent);
  const syncOnReconnect = useNotificationStore((state) => state.syncOnReconnect);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-gray-100 px-4 py-6 lg:px-8">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="rounded-3xl border border-white/5 bg-[#1A1A1A] p-6 shadow-xl shadow-black/20 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-yellow-400/90">
                Quản lý thông báo
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Bảng điều khiển thông báo
              </h1>
              <p className="mt-2 text-sm text-gray-400 max-w-2xl">
                Theo dõi, soạn, lên lịch, quản lý mẫu và cấu hình quy tắc tự động cho hệ thống.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                  Chưa đọc
                </p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {unreadCount}
                </p>
              </div>
              <button
                type="button"
                onClick={syncOnReconnect}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20"
              >
                <Globe size={16} />
                Đồng bộ lại
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-white/5 p-4 shadow-lg shadow-black/20">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${
                    activeTab === tab.key
                      ? "bg-yellow-500/20 text-yellow-100 ring-1 ring-yellow-400/30"
                      : "text-gray-400 hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-xl shadow-black/20">
          {activeTab === "live" && (
            <LiveFeed
              notifications={notifications}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />
          )}
          {activeTab === "compose" && (
            <ComposeForm
              templates={templates}
              onSend={addNotification}
              onSchedule={scheduleNotification}
            />
          )}
          {activeTab === "schedule" && (
            <ScheduledList
              scheduled={scheduled}
              onCancel={removeScheduled}
            />
          )}
          {activeTab === "templates" && (
            <TemplateManager
              templates={templates}
              onCreate={addTemplate}
              onUpdate={updateTemplate}
              onDelete={deleteTemplate}
            />
          )}
          {activeTab === "rules" && (
            <AutoRulesTable
              rules={autoRules}
              onUpdate={updateAutoRule}
              onTest={triggerAutoEvent}
            />
          )}
        </div>
      </div>
    </div>
  );
}
