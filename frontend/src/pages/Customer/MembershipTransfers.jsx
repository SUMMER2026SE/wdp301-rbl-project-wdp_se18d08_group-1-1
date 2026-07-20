import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { API_BASE } from "../../services/api";
import {
  acceptEntitlementTransfer,
  createEntitlementTransfer,
  getMembershipStatus,
  getMyEntitlementTransfers,
  rejectEntitlementTransfer,
  settleEntitlementTransfer,
} from "../../services/subscriptionService";
import { getWalletInfo } from "../../services/walletService";
import MembershipOwnershipPanel from "../../components/membership/MembershipOwnershipPanel";

const STATUS_META = {
  PENDING_RECIPIENT: {
    label: "Waiting for recipient",
    className: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  },
  PENDING_ADMIN: {
    label: "Waiting for admin",
    className: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  },
  AWAITING_PAYMENT: {
    label: "Payment required",
    className: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  },
  COMPLETED: {
    label: "Completed",
    className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "border-white/10 bg-white/5 text-white/45",
  },
  EXPIRED: {
    label: "Expired",
    className: "border-white/10 bg-white/5 text-white/45",
  },
};

const EMPTY_FORM = { toUserEmail: "", askingPrice: "", reason: "" };
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VND`;
const entityId = (entity) => String(entity?._id || entity || "");

export default function MembershipTransfers() {
  const navigate = useNavigate();
  const currentUser = useMemo(
    () => JSON.parse(sessionStorage.getItem("valo_user") || "{}"),
    [],
  );
  const currentUserId = String(currentUser?._id || currentUser?.id || "");
  const currentUserEmail = String(currentUser?.email || "").toLowerCase();
  const [transfers, setTransfers] = useState([]);
  const [membership, setMembership] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const [transferRes, membershipRes, walletRes] = await Promise.all([
        getMyEntitlementTransfers(),
        getMembershipStatus(),
        getWalletInfo(),
      ]);

      if (membershipRes.ok && membershipRes.data?.success) {
        setMembership(membershipRes.data.data);
      }
      if (walletRes.ok && walletRes.data?.success) {
        setWalletBalance(Number(walletRes.data.data?.balance || 0));
      }
      if (!transferRes.ok || !transferRes.data?.success) {
        throw new Error(transferRes.data?.message || "Unable to load transfer requests.");
      }
      setTransfers(transferRes.data.data || []);
    } catch (error) {
      toast.error(error.message || "Unable to load membership transfers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => loadData(), 0);
    return () => window.clearTimeout(timerId);
  }, [loadData]);

  const refreshData = useCallback(
    () => loadData({ silent: true }),
    [loadData],
  );

  const filteredTransfers = useMemo(
    () =>
      transfers.filter((transfer) => {
        const isCurrentUser = (entity) =>
          (currentUserId && entityId(entity) === currentUserId) ||
          (currentUserEmail &&
            String(entity?.email || "").toLowerCase() === currentUserEmail);
        if (filter === "incoming") return isCurrentUser(transfer.toUserId);
        if (filter === "outgoing") return isCurrentUser(transfer.fromUserId);
        return true;
      }),
    [currentUserEmail, currentUserId, filter, transfers],
  );

  const handleCreate = async () => {
    if (!selectedSlot?.entitlementId) return;
    setActiveAction(`create:${selectedSlot.entitlementId}`);
    try {
      const response = await createEntitlementTransfer(selectedSlot.entitlementId, {
        toUserEmail: form.toUserEmail.trim(),
        askingPrice: Number(form.askingPrice || 0),
        reason: form.reason.trim(),
      });
      if (!response.ok || !response.data?.success) {
        toast.error(response.data?.message || "Unable to create transfer request.");
        return;
      }
      toast.success("Transfer invitation sent to the recipient.");
      setSelectedSlot(null);
      setForm(EMPTY_FORM);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error.message || "Unable to create transfer request.");
    } finally {
      setActiveAction("");
    }
  };

  const handleAction = async (transfer, action) => {
    setActiveAction(`${action}:${transfer._id}`);
    try {
      const response =
        action === "accept"
          ? await acceptEntitlementTransfer(transfer._id)
          : action === "settle"
            ? await settleEntitlementTransfer(transfer._id)
            : await rejectEntitlementTransfer(
                transfer._id,
                action === "cancel" ? "Cancelled by sender" : "Declined by recipient",
              );

      if (!response.ok || !response.data?.success) {
        toast.error(response.data?.message || "Unable to update this transfer.");
        return;
      }

      const messages = {
        accept: "Accepted. The request is now waiting for admin review.",
        settle: "Payment completed. The parking space has been transferred.",
        cancel: "Transfer request cancelled.",
        reject: "Transfer invitation declined.",
      };
      toast.success(messages[action]);
      await loadData({ silent: true });
    } catch (error) {
      toast.error(error.message || "Unable to update this transfer.");
    } finally {
      setActiveAction("");
    }
  };

  const downloadContract = async (transferId) => {
    setActiveAction(`pdf:${transferId}`);
    try {
      const response = await fetch(
        `${API_BASE}/membership-entitlement-transfers/${transferId}/pdf`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } },
      );
      if (!response.ok) {
        toast.error("Unable to download the transfer contract.");
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `Membership-Transfer-${transferId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to download the transfer contract.");
    } finally {
      setActiveAction("");
    }
  };

  return (
    <div className="min-h-full bg-[#0D0D0D] px-4 py-6 text-white sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#DCA11D]">
              Profile
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Membership transfers
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Send a parking-space entitlement, respond to invitations, pay after
              admin approval, and keep the signed PDF contract.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshData}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        <MembershipOwnershipPanel
          membership={membership}
          walletBalance={walletBalance}
          onRefresh={refreshData}
          onTransfer={(slot) => {
            setSelectedSlot(slot);
            setForm(EMPTY_FORM);
          }}
        />

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#151515] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Requests and contracts</h2>
              <p className="mt-1 text-sm text-white/40">
                Incoming invitations require your confirmation before admin can see them.
              </p>
            </div>
            <div className="flex rounded-xl bg-black/25 p-1">
              {["all", "incoming", "outgoing"].map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
                    filter === item
                      ? "bg-white/10 text-white"
                      : "text-white/35 hover:text-white/65"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center text-white/40">
                <Loader2 size={24} className="animate-spin" />
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                <FileText size={26} className="mx-auto text-white/20" />
                <p className="mt-3 text-sm font-bold text-white/50">
                  No {filter === "all" ? "" : `${filter} `}transfer requests
                </p>
              </div>
            ) : (
              filteredTransfers.map((transfer) => {
                const isCurrentUser = (entity) =>
                  (currentUserId && entityId(entity) === currentUserId) ||
                  (currentUserEmail &&
                    String(entity?.email || "").toLowerCase() === currentUserEmail);
                const isRecipient = isCurrentUser(transfer.toUserId);
                const isSender = isCurrentUser(transfer.fromUserId);
                const status = STATUS_META[transfer.status] || {
                  label: transfer.status,
                  className: "border-white/10 bg-white/5 text-white/50",
                };
                const totalDue =
                  Number(transfer.askingPrice || 0) + Number(transfer.transferFee || 0);
                const processing = activeAction.endsWith(`:${transfer._id}`);

                return (
                  <article
                    key={transfer._id}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#DCA11D]">
                          {isRecipient ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>
                              Space {transfer.entitlementId?.slotCode || "—"}
                            </strong>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-xs text-white/40">
                            {transfer.fromUserId?.email || "Unknown"} →{" "}
                            {transfer.toUserId?.email || "Unknown"}
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            Price {money(transfer.askingPrice)} · Fee{" "}
                            {money(transfer.transferFee)}
                          </p>
                          {transfer.rejectionReason && (
                            <p className="mt-2 text-xs text-rose-300/80">
                              Reason: {transfer.rejectionReason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {isRecipient && transfer.status === "PENDING_RECIPIENT" && (
                          <>
                            <button
                              type="button"
                              disabled={processing}
                              onClick={() => handleAction(transfer, "reject")}
                              className="min-h-10 rounded-xl border border-white/10 px-4 text-xs font-bold text-white/55 hover:bg-white/5 disabled:opacity-40"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              disabled={processing}
                              onClick={() => handleAction(transfer, "accept")}
                              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-black disabled:opacity-40"
                            >
                              {processing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              Accept
                            </button>
                          </>
                        )}
                        {isSender &&
                          ["PENDING_RECIPIENT", "PENDING_ADMIN"].includes(transfer.status) && (
                            <button
                              type="button"
                              disabled={processing}
                              onClick={() => handleAction(transfer, "cancel")}
                              className="min-h-10 rounded-xl border border-rose-400/20 px-4 text-xs font-bold text-rose-300 hover:bg-rose-400/10 disabled:opacity-40"
                            >
                              Cancel request
                            </button>
                          )}
                        {isRecipient && transfer.status === "PENDING_ADMIN" && (
                          <span className="inline-flex min-h-10 items-center gap-2 px-2 text-xs text-white/40">
                            <Clock3 size={15} />
                            Admin review
                          </span>
                        )}
                        {isRecipient && transfer.status === "AWAITING_PAYMENT" && (
                          <>
                            <div className="mr-2 text-right text-xs">
                              <p className="text-white/35">Total due</p>
                              <p className="mt-1 font-black text-[#E8B63E]">
                                {money(totalDue)}
                              </p>
                            </div>
                            {walletBalance >= totalDue ? (
                              <button
                                type="button"
                                disabled={processing}
                                onClick={() => handleAction(transfer, "settle")}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#DCA11D] px-4 text-xs font-black text-[#16130B] disabled:opacity-40"
                              >
                                {processing ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                                Pay from wallet
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigate("/customer/wallet")}
                                className="min-h-10 rounded-xl bg-rose-400/10 px-4 text-xs font-black text-rose-300"
                              >
                                Top up {money(totalDue - walletBalance)}
                              </button>
                            )}
                          </>
                        )}
                        {transfer.status === "COMPLETED" && (
                          <button
                            type="button"
                            disabled={processing}
                            onClick={() => downloadContract(transfer._id)}
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black text-white/70 hover:bg-white/5 disabled:opacity-40"
                          >
                            {processing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Download PDF
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#171717] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#DCA11D]">
                  New transfer
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Transfer space {selectedSlot.slotCode}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/40">
                  The recipient accepts first. Admin review and wallet payment follow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/40 hover:bg-white/5 hover:text-white"
                aria-label="Close transfer form"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-white/50">Recipient email</span>
                <input
                  type="email"
                  value={form.toUserEmail}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, toUserEmail: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-[#DCA11D]"
                  placeholder="member@example.com"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-white/50">Transfer price (VND)</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.askingPrice}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, askingPrice: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-[#DCA11D]"
                  placeholder="0 for a free transfer"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-white/50">Reason</span>
                <textarea
                  rows="3"
                  maxLength="500"
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reason: event.target.value }))
                  }
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-[#DCA11D]"
                  placeholder="Why are you transferring this parking space?"
                />
              </label>
              <p className="rounded-xl bg-white/5 p-3 text-xs leading-5 text-white/40">
                The price cannot exceed the prorated remaining value. The recipient also
                pays a 5% processing fee (minimum 10,000 VND, maximum 50,000 VND).
              </p>
              <button
                type="button"
                disabled={
                  activeAction.startsWith("create:") ||
                  !form.toUserEmail.trim() ||
                  !form.reason.trim()
                }
                onClick={handleCreate}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#DCA11D] px-5 text-sm font-black text-[#16130B] disabled:opacity-40"
              >
                {activeAction.startsWith("create:") && (
                  <Loader2 size={17} className="animate-spin" />
                )}
                Send transfer invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
