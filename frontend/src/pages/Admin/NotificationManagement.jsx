import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Send,
  Calendar,
  FileText,
  Zap,
  Globe,
} from "lucide-react";
import { useSocket } from "../../contexts/SocketProvider";
import LiveFeed from "./notifications/LiveFeed";
import ComposeForm from "./notifications/ComposeForm";
import ScheduledList from "./notifications/ScheduledList";
import TemplateManager from "./notifications/TemplateManager";
import AutoRulesTable from "./notifications/AutoRulesTable";
import { DEFAULT_TEMPLATES } from "../../lib/notifications/types";
import * as notifApi from "../../services/notificationService";

const TABS = [
  { key: "live", label: "Phát sóng trực tiếp", icon: Bell },
  { key: "compose", label: "Soạn (Gửi thông báo)", icon: Send },
  { key: "schedule", label: "Lịch trình", icon: Calendar },
  { key: "templates", label: "Mẫu", icon: FileText },
  { key: "rules", label: "Quy tắc tự động", icon: Zap },
];

export default function NotificationManagement() {
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState("live");

  const [liveNotifications, setLiveNotifications] = useState([]);
  const [autoRules, setAutoRules] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);

  const fetchLiveFeed = useCallback(async () => {
    try {
      const res = await notifApi.getAdminHistory({ page: 1, limit: 50 });
      if (res.ok && res.data) {
        const items = (res.data.data || []).map((n) => ({
          id: n._id,
          title: n.title,
          message: n.content,
          priority: n.priority,
          type: n.type,
          target: {
            type: n.targetType === "ALL_USERS" ? "all" :
                  n.targetType === "MULTI_USER" ? "multi" : "single",
          },
          channels: ["In-app"],
          eventKey: n.metadata?.eventType || null,
          createdAt: n.createdAt,
          read: Boolean(n.isRead),
          metadata: n.metadata || {},
          createdBy: n.createdBy,
          targetUsers: n.targetUsers,
        }));
        setLiveNotifications(items);
      }
    } catch (err) {
      console.error("Failed to fetch live feed:", err);
    }
  }, []);

  const fetchAutoRules = useCallback(async () => {
    try {
      const res = await notifApi.getAutoRules();
      if (res.ok && res.data) {
        const rules = (res.data.data || []).map((r) => ({
          eventKey: r.eventKey,
          group: r.group,
          name: r.name,
          description: r.description,
          priority: r.priority,
          enabled: r.enabled,
          channels: r.channels || [],
          throttleMinutes: r.throttleMinutes || 10,
          lastTriggeredAt: r.lastTriggeredAt,
        }));
        setAutoRules(rules);
      }
    } catch (err) {
      console.error("Failed to fetch auto rules:", err);
    }
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => {
      if (activeTab === "live") fetchLiveFeed();
      if (activeTab === "rules") fetchAutoRules();
    }, 0);

    return () => clearTimeout(timerId);
  }, [activeTab, fetchLiveFeed, fetchAutoRules]);

  useEffect(() => {
    if (!socket) return;

    const handleAdminNotification = () => {
      fetchLiveFeed();
    };

    socket.on("notification:admin:new", handleAdminNotification);

    return () => {
      socket.off("notification:admin:new", handleAdminNotification);
    };
  }, [socket, fetchLiveFeed]);

  const handleMarkRead = useCallback(async (id) => {
    setLiveNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );

    try {
      const res = await notifApi.markAdminHistoryAsRead(id);
      if (!res.ok) fetchLiveFeed();
    } catch (err) {
      console.error("Failed to mark admin notification as read:", err);
      fetchLiveFeed();
    }
  }, [fetchLiveFeed]);

  const handleMarkAllRead = useCallback(async () => {
    setLiveNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      const res = await notifApi.markAllAdminHistoryAsRead();
      if (!res.ok) fetchLiveFeed();
    } catch (err) {
      console.error("Failed to mark all admin notifications as read:", err);
      fetchLiveFeed();
    }
  }, [fetchLiveFeed]);

  const handleUpdateAutoRule = useCallback(async (eventKey, patch) => {
    setAutoRules((prev) =>
      prev.map((r) => (r.eventKey === eventKey ? { ...r, ...patch } : r))
    );
    try {
      const res = await notifApi.updateAutoRule(eventKey, patch);
      if (!res.ok) fetchAutoRules();
    } catch (err) {
      console.error("Failed to update auto rule:", err);
      fetchAutoRules();
    }
  }, [fetchAutoRules]);

  const handleTestAutoRule = useCallback(async (eventKey) => {
    try {
      const res = await notifApi.testAutoRule(eventKey);
      if (res.ok) {
        fetchLiveFeed();
        fetchAutoRules();
      }
    } catch (err) {
      console.error("Failed to test auto rule:", err);
    }
  }, [fetchAutoRules, fetchLiveFeed]);

  const handleSendNotification = useCallback(async (payload) => {
    try {
      const targetMap = {
        all: "ALL_USERS",
        single: "SINGLE_USER",
        multi: "MULTI_USER",
      };

      const apiPayload = {
        title: payload.title,
        content: payload.message,
        type: "SYSTEM",
        priority: payload.priority || "INFO",
        targetType: targetMap[payload.target?.type] || "ALL_USERS",
        targetUsers: payload.target?.type === "single"
          ? [payload.target.value]
          : payload.target?.type === "multi"
          ? (payload.target.value || "").split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };

      const res = await notifApi.createNotification(apiPayload);
      if (res.ok) {
        fetchLiveFeed();
      } else {
        console.error("Failed to send notification:", res.data);
      }
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  }, [fetchLiveFeed]);

  const scheduleNotification = useCallback((payload) => {
    setScheduled((prev) => [
      {
        ...payload,
        id: `scheduled_${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const removeScheduled = useCallback((id) => {
    setScheduled((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addTemplate = useCallback((template) => {
    setTemplates((prev) => [
      ...prev,
      {
        ...template,
        id: `tmpl_${Date.now()}`,
      },
    ]);
  }, []);

  const updateTemplate = useCallback((id, patch) => {
    setTemplates((prev) =>
      prev.map((template) => (template.id === id ? { ...template, ...patch } : template))
    );
  }, []);

  const deleteTemplate = useCallback((id) => {
    setTemplates((prev) => prev.filter((template) => template.id !== id));
  }, []);

  const unreadCount = liveNotifications.filter((item) => !item.read).length;

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
                onClick={fetchLiveFeed}
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
              notifications={liveNotifications}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
            />
          )}
          {activeTab === "compose" && (
            <ComposeForm
              templates={templates}
              onSend={handleSendNotification}
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
              onUpdate={handleUpdateAutoRule}
              onTest={handleTestAutoRule}
            />
          )}
        </div>
      </div>
    </div>
  );
}
