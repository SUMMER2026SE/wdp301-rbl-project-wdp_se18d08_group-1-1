import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PRIORITY, DEFAULT_TEMPLATES, AUTO_RULES } from "./types";

const DEDUP_WINDOW_MS = 5000;
const SCHEDULE_INTERVAL_MS = 10000;
const recentPayloadHashes = new Map();

const createHash = (payload) => {
  const targetKey = payload.target?.type || "system";
  return `${payload.priority}|${payload.title}|${payload.message}|${targetKey}|${payload.target?.value || ""}`;
};

const cleanDedupWindow = () => {
  const now = Date.now();
  for (const [hash, time] of recentPayloadHashes.entries()) {
    if (now - time > DEDUP_WINDOW_MS) {
      recentPayloadHashes.delete(hash);
    }
  }
};

const store = persist(
  (set, get) => ({
    notifications: [],
    scheduled: [],
    templates: DEFAULT_TEMPLATES,
    autoRules: AUTO_RULES,

  addNotification: (payload) => {
    cleanDedupWindow();
    const hash = createHash(payload);
    if (recentPayloadHashes.has(hash)) {
      return false;
    }
    recentPayloadHashes.set(hash, Date.now());

    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: payload.title,
      message: payload.message,
      priority: payload.priority || PRIORITY.INFO,
      target: payload.target || { type: "system" },
      channels: payload.channels || ["In-app"],
      eventKey: payload.eventKey || null,
      createdAt: new Date().toISOString(),
      read: false,
    };

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 300),
    }));
    return true;
  },

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({
        ...item,
        read: true,
      })),
    })),

  scheduleNotification: (draft) => {
    const scheduled = {
      id: `sched_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: draft.title,
      message: draft.message,
      priority: draft.priority || PRIORITY.INFO,
      target: draft.target || { type: "all" },
      channels: draft.channels || ["In-app"],
      sendAt: draft.sendAt,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      scheduled: [scheduled, ...state.scheduled],
    }));
    return scheduled;
  },

  removeScheduled: (id) =>
    set((state) => ({
      scheduled: state.scheduled.filter((item) => item.id !== id),
    })),

  processScheduled: () => {
    const now = Date.now();
    set((state) => {
      const ready = state.scheduled.filter(
        (item) => new Date(item.sendAt).getTime() <= now,
      );
      if (ready.length === 0) {
        return {};
      }

      const dueNotifications = ready.map((item) => ({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: item.title,
        message: item.message,
        priority: item.priority,
        target: item.target,
        channels: item.channels,
        eventKey: item.eventKey || "scheduled",
        createdAt: new Date().toISOString(),
        read: false,
      }));

      return {
        scheduled: state.scheduled.filter(
          (item) => new Date(item.sendAt).getTime() > now,
        ),
        notifications: [...dueNotifications, ...state.notifications].slice(0, 300),
      };
    });
  },

  syncOnReconnect: () => {
    get().addNotification({
      title: "Kết nối lại",
      message: "Đồng bộ thông báo khi socket kết nối lại.",
      priority: PRIORITY.SYSTEM,
      target: { type: "system" },
      channels: ["In-app"],
      eventKey: "sync_reconnect",
    });
  },

  triggerAutoEvent: (eventKey, payload = {}) => {
    const rule = get().autoRules.find((item) => item.eventKey === eventKey);
    if (!rule || !rule.enabled) {
      return false;
    }

    const now = Date.now();
    if (
      rule.lastTriggeredAt &&
      now - rule.lastTriggeredAt < rule.throttleMinutes * 60000
    ) {
      return false;
    }

    set((state) => ({
      autoRules: state.autoRules.map((item) =>
        item.eventKey === eventKey
          ? { ...item, lastTriggeredAt: now }
          : item,
      ),
    }));

    get().addNotification({
      title: `[${rule.group}] ${rule.name}`,
      message:
        payload.message ||
        `Sự kiện tự động ${rule.name} đã được kích hoạt và gửi qua các kênh ${rule.channels.join(", ")}.`,
      priority: PRIORITY.INFO,
      target: { type: "system" },
      channels: rule.channels,
      eventKey,
    });
    return true;
  },

  addTemplate: (template) =>
    set((state) => ({
      templates: [
        {
          id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: template.name,
          title: template.title,
          message: template.message,
          priority: template.priority || PRIORITY.INFO,
        },
        ...state.templates,
      ],
    })),

  updateTemplate: (id, data) =>
    set((state) => ({
      templates: state.templates.map((item) =>
        item.id === id ? { ...item, ...data } : item,
      ),
    })),

  deleteTemplate: (id) =>
    set((state) => ({
      templates: state.templates.filter((item) => item.id !== id),
    })),

  updateAutoRule: (eventKey, patch) =>
    set((state) => ({
      autoRules: state.autoRules.map((item) =>
        item.eventKey === eventKey ? { ...item, ...patch } : item,
      ),
    })),
  }),
  {
    name: "valo_notifications_store",
    getStorage: () => localStorage,
    partialize: (state) => ({
      notifications: state.notifications,
      scheduled: state.scheduled,
      templates: state.templates,
      autoRules: state.autoRules,
    }),
  },
);

export const useNotificationStore = create(store);

if (typeof window !== "undefined" && !window.__valoNotificationScheduler) {
  window.__valoNotificationScheduler = true;
  setInterval(() => {
    useNotificationStore.getState().processScheduled();
  }, SCHEDULE_INTERVAL_MS);
}
