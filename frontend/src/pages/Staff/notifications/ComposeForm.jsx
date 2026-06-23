import { useMemo, useState } from "react";
import { Bell, Calendar, FileText, Mail, Send, User, Users } from "lucide-react";
import { PRIORITY, PRIORITY_META, TARGET_OPTIONS } from "../../../lib/notifications/types";

const sampleCustomers = [
  { id: "cust_001", name: "Nguyen Van A" },
  { id: "cust_002", name: "Tran Thi B" },
  { id: "cust_003", name: "Le Van C" },
  { id: "cust_004", name: "Pham Thi D" },
];

const AVAILABLE_CHANNELS = ["In-app", "Email"];

export default function ComposeForm({ templates, onSend, onSchedule }) {
  const [target, setTarget] = useState("all");
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState(PRIORITY.INFO);
  const [channels, setChannels] = useState(["In-app"]);
  const [sendAt, setSendAt] = useState("");

  const recipientLabel = useMemo(() => {
    if (target === "single") return "One Customer";
    if (target === "multi") return "Multiple Customers";
    return "System-wide";
  }, [target]);

  const applyTemplate = (template) => {
    setTitle(template.title);
    setMessage(template.message);
    setPriority(template.priority);
  };

  const buildTarget = () => {
    if (target === "single") {
      return { type: "single", value: selectedCustomers[0] || "unknown" };
    }
    if (target === "multi") {
      return { type: "multi", value: selectedCustomers.join(", ") };
    }
    return { type: "all" };
  };

  const handleSubmit = (mode) => {
    const payload = {
      title: title || "New notification",
      message: message || "Notification content has not been entered.",
      priority,
      target: buildTarget(),
      channels: channels.length > 0 ? channels : ["In-app"],
    };

    if (mode === "schedule" && sendAt) {
      onSchedule({ ...payload, sendAt });
      return;
    }

    onSend(payload);
  };

  const toggleChannel = (channel) => {
    const isActive = channels.includes(channel);
    const nextChannels = isActive
      ? channels.filter((item) => item !== channel)
      : [...channels, channel];

    if (nextChannels.length > 0) {
      setChannels(nextChannels);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-5">
          <div className="flex items-center gap-3 text-yellow-400">
            <Bell size={18} />
            <h2 className="text-lg font-semibold text-white">Compose notification</h2>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Audience</label>
              <select
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none focus:border-yellow-400"
              >
                {TARGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {(target === "single" || target === "multi") && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-gray-200">Select customers</p>
                <div className="mt-3 space-y-2">
                  {sampleCustomers.map((customer) => (
                    <label
                      key={customer.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300 hover:border-yellow-500/30"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedCustomers((prev) => [...prev, customer.id]);
                          } else {
                            setSelectedCustomers((prev) => prev.filter((id) => id !== customer.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-500 bg-white/5 text-yellow-400"
                      />
                      <span>{customer.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter notification title"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">Priority</label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none focus:border-yellow-400"
                >
                  {Object.entries(PRIORITY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Delivery channels</label>
              <div className="flex flex-wrap gap-3">
                {AVAILABLE_CHANNELS.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      channels.includes(channel)
                        ? "border-yellow-500/40 bg-yellow-500/15 text-yellow-200"
                        : "border-white/10 bg-white/5 text-gray-300 hover:border-yellow-500/20"
                    }`}
                  >
                    {channel === "Email" ? <Mail size={16} /> : <Bell size={16} />}
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => templates[0] && applyTemplate(templates[0])}
                className="inline-flex items-center gap-2 rounded-3xl bg-yellow-500/15 px-4 py-3 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/20"
              >
                <FileText size={16} />
                Apply from templates
              </button>
              <span className="text-sm text-gray-400">Choose a template to quickly load existing content.</span>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">Content</label>
              <textarea
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Enter notification content"
                className="w-full resize-none rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-gray-100 outline-none focus:border-yellow-400"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/5 bg-white/5 p-5">
          <div className="flex items-center gap-3 text-yellow-400">
            <FileText size={18} />
            <h2 className="text-lg font-semibold text-white">Template content</h2>
          </div>
          <div className="grid gap-3">
            {templates.slice(0, 3).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-left text-sm text-gray-200 hover:border-yellow-400/40"
              >
                <p className="font-semibold text-white">{template.name}</p>
                <p className="mt-1 truncate text-xs text-gray-400">{template.title}</p>
              </button>
            ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-200">Schedule delivery</p>
                <p className="text-xs text-gray-500">Choose when to send the notification later.</p>
              </div>
              <Calendar size={18} className="text-yellow-300" />
            </div>
            <input
              type="datetime-local"
              value={sendAt}
              onChange={(event) => setSendAt(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-100 outline-none focus:border-yellow-400"
            />
          </div>

          <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 text-gray-300">
              <Users size={16} />
              <p className="text-sm">Current audience: {recipientLabel}</p>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <User size={16} />
              <p className="text-sm">
                Selected customers: {selectedCustomers.length || "0"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Bell size={16} />
              <p className="text-sm">Priority: {PRIORITY_META[priority].label}</p>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Mail size={16} />
              <p className="text-sm">Channels: {channels.join(", ")}</p>
            </div>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => handleSubmit("send")}
              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
            >
              <Send size={16} />
              Send now
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("schedule")}
              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-100 hover:border-yellow-400 hover:text-yellow-100"
            >
              <Calendar size={16} />
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
