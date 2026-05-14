"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  createReturn,
  deleteOrder,
  getOrders,
  getSettings,
  updateOrder,
  type Channel,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type Settings,
} from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, FormField } from "@/components/admin/primitives";

type TabKey = "All" | OrderStatus;

const ALL_TABS: TabKey[] = [
  "All",
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
];
const STEPPER_STAGES: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cod", label: "COD" },
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
];

const DEFAULT_SETTINGS: Settings = {
  shopName: "STITCH Studio",
  currency: "NPR",
  lowStockThreshold: 5,
  acceptedPaymentMethods: ["cash", "bank_transfer", "cod", "esewa", "khalti"],
};

const EMPTY_ORDERS: Order[] = [];

const CHANNEL_FILTER_OPTIONS = [
  { value: "", label: "All Channels" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website" },
  { value: "manual", label: "Manual" },
];

// ─── Utilities ──────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function normalizeSettings(settings?: Partial<Settings> | null): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    currency: "NPR",
    acceptedPaymentMethods: Array.isArray(settings?.acceptedPaymentMethods)
      ? settings.acceptedPaymentMethods
      : DEFAULT_SETTINGS.acceptedPaymentMethods,
  };
}

function normalizePaymentStatus(value: string | undefined): PaymentStatus {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized || normalized === "pending") return "unpaid";
  if (normalized === "paid") return "cash";
  if (normalized === "bank transfer") return "bank_transfer";
  if (normalized === "cod") return "cod";
  if (normalized === "cash") return "cash";
  if (normalized === "esewa") return "esewa";
  if (normalized === "khalti") return "khalti";
  return "unpaid";
}

function formatPaymentStatusLabel(value: string | undefined) {
  const normalized = normalizePaymentStatus(value);
  return (
    PAYMENT_STATUS_OPTIONS.find((o) => o.value === normalized)?.label ??
    "Unpaid"
  );
}

function getPaymentStatusClasses(value: string | undefined) {
  const normalized = normalizePaymentStatus(value);
  if (normalized === "cash")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (normalized === "bank_transfer")
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if (normalized === "cod")
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (normalized === "esewa")
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  if (normalized === "khalti")
    return "border-pink-500/30 bg-pink-500/10 text-pink-300";
  return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
}

function getStatusBadgeClasses(status: OrderStatus) {
  if (status === "Delivered")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "Cancelled")
    return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "Shipped")
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if (status === "Confirmed")
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

function getStatusBorderAccent(status: OrderStatus): string {
  if (status === "Pending") return "border-l-amber-400/70";
  if (status === "Confirmed") return "border-l-blue-400/70";
  if (status === "Shipped") return "border-l-purple-400/70";
  if (status === "Delivered") return "border-l-emerald-400/70";
  return "border-l-zinc-500/50";
}

function getChannelBadgeClasses(channel: Channel): string {
  if (channel === "instagram")
    return "border-pink-500/30 bg-pink-500/10 text-pink-300";
  if (channel === "facebook")
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  if (channel === "website")
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
}

function getOrderPhone(order: Order) {
  return order.customerPhone || order.phone || "";
}

function getOrderAddress(order: Order) {
  return order.customerAddress || order.address || "";
}

function getNextAction(
  status: OrderStatus,
): { label: string; nextStatus: OrderStatus } | null {
  if (status === "Pending")
    return { label: "Confirm Order", nextStatus: "Confirmed" };
  if (status === "Confirmed")
    return { label: "Mark as Shipped", nextStatus: "Shipped" };
  if (status === "Shipped")
    return { label: "Mark as Delivered", nextStatus: "Delivered" };
  return null;
}

// ─── Badge components ────────────────────────────────────────────────────────

function PaymentStatusBadge({ value }: { value: string | undefined }) {
  return (
    <Badge
      variant="soft"
      className={cn(
        "shrink-0 border text-[10px] leading-none",
        getPaymentStatusClasses(value),
      )}
    >
      {formatPaymentStatusLabel(value)}
    </Badge>
  );
}

function StatusBadge({ value }: { value: OrderStatus }) {
  return (
    <Badge
      variant="soft"
      className={cn(
        "shrink-0 border text-[10px] leading-none",
        getStatusBadgeClasses(value),
      )}
    >
      {value}
    </Badge>
  );
}

function ChannelBadge({ channel }: { channel: Channel }) {
  const labels: Record<Channel, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    website: "Website",
    manual: "Manual",
  };
  return (
    <Badge
      variant="soft"
      className={cn(
        "shrink-0 border text-[10px] leading-none",
        getChannelBadgeClasses(channel),
      )}
    >
      {labels[channel] ?? channel}
    </Badge>
  );
}

// ─── Status stepper ──────────────────────────────────────────────────────────

function StatusStepper({ currentStatus }: { currentStatus: OrderStatus }) {
  if (currentStatus === "Cancelled") {
    return (
      <div className="inline-flex rounded-[12px] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300">
        Cancelled
      </div>
    );
  }

  const currentIndex = STEPPER_STAGES.indexOf(currentStatus);

  return (
    <div className="flex items-start">
      {STEPPER_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <div key={stage} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full transition-colors",
                  isCurrent
                    ? "bg-[#c9a96e] ring-2 ring-[#c9a96e]/30"
                    : isCompleted
                      ? "bg-emerald-400"
                      : "bg-border",
                )}
              />
              {index < STEPPER_STAGES.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors",
                    isCompleted ? "bg-emerald-400/50" : "bg-border/40",
                  )}
                />
              )}
            </div>
            <p
              className={cn(
                "mt-1.5 max-w-[44px] text-center text-[9px] leading-tight",
                isCurrent
                  ? "font-semibold text-[#c9a96e]"
                  : isCompleted
                    ? "text-emerald-400"
                    : "text-muted-foreground",
              )}
            >
              {stage}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Return form ─────────────────────────────────────────────────────────────

function ReturnForm({
  order,
  token,
  onDone,
}: {
  order: Order;
  token: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);

  const returnMutation = useMutation({
    mutationFn: () => createReturn(token, order._id, { reason, restock }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      ]);
      toast.success("Return recorded");
      onDone();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to record return",
      );
    },
  });

  return (
    <div className="space-y-3 rounded-[16px] border border-orange-500/20 bg-orange-500/5 p-4">
      <p className="text-sm font-semibold text-[#f0ede8]">Record return</p>
      <FormField label="Reason">
        <Textarea
          className="min-h-20"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why was this order returned?"
        />
      </FormField>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={restock}
          onChange={(e) => setRestock(e.target.checked)}
        />
        Restock the returned items
      </label>
      {returnMutation.isError ? (
        <p className="text-sm text-destructive">
          {returnMutation.error instanceof Error
            ? returnMutation.error.message
            : "Failed to record the return"}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={returnMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => returnMutation.mutate()}
          disabled={returnMutation.isPending || !reason.trim()}
        >
          {returnMutation.isPending ? "Saving…" : "Save return"}
        </Button>
      </div>
    </div>
  );
}

// ─── Order detail modal ───────────────────────────────────────────────────────

function OrderDetailModal({
  order,
  token,
  settings,
  onClose,
}: {
  order: Order;
  token: string;
  settings: Settings;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [trackingInput, setTrackingInput] = useState(
    order.trackingNumber ?? "",
  );
  const [draftPaymentStatus, setDraftPaymentStatus] = useState<PaymentStatus>(
    normalizePaymentStatus(order.paymentStatus),
  );
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCODPrompt, setShowCODPrompt] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);

  const isFinal =
    order.orderStatus === "Delivered" || order.orderStatus === "Cancelled";
  const isCancelled = order.orderStatus === "Cancelled";
  const nextAction = isCancelled ? null : getNextAction(order.orderStatus);
  const showTrackingField =
    order.orderStatus === "Confirmed" || order.orderStatus === "Shipped";

  const acceptedMethods = Array.isArray(settings.acceptedPaymentMethods)
    ? settings.acceptedPaymentMethods
    : DEFAULT_SETTINGS.acceptedPaymentMethods;
  const paymentOptions = PAYMENT_STATUS_OPTIONS.filter(
    (o) => o.value === "unpaid" || acceptedMethods.includes(o.value),
  );

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateOrder>[2]) =>
      updateOrder(token, order._id, payload),
    onSuccess: async (data) => {
      await invalidateAll();
      toast.success(`Order ${data.item.orderNumber} updated`);
      onClose();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update order",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrder(token, order._id),
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Order deleted");
      onClose();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete order",
      );
    },
  });

  const handlePrimaryAction = () => {
    if (!nextAction) return;
    const { nextStatus } = nextAction;

    if (
      nextStatus === "Delivered" &&
      draftPaymentStatus === "cod" &&
      !showCODPrompt
    ) {
      setShowCODPrompt(true);
      return;
    }

    updateMutation.mutate({
      status: nextStatus,
      trackingNumber: trackingInput || undefined,
      paymentStatus: draftPaymentStatus,
    });
  };

  const phone = getOrderPhone(order);
  const address = getOrderAddress(order);
  const paymentStatusChanged =
    draftPaymentStatus !== normalizePaymentStatus(order.paymentStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[30px] bg-background p-6 shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-4 top-4 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* ── Left: read-only summary ── */}
          <div className="space-y-5">
            {/* Header */}
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[#f0ede8]">
                  {order.orderNumber}
                </p>
                <ChannelBadge channel={order.channel} />
                <StatusBadge value={order.orderStatus} />
                {order.hasReturn ? (
                  <Badge
                    variant="soft"
                    className="border border-orange-500/30 bg-orange-500/10 text-[10px] leading-none text-orange-300"
                  >
                    Return Filed
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Customer */}
            <div className="space-y-1 rounded-[16px] border border-border/50 bg-background/50 p-3">
              <p className="text-sm font-semibold text-[#f0ede8]">
                {order.customerName}
              </p>
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="block text-sm text-sky-400 hover:text-sky-300"
                >
                  {phone}
                </a>
              ) : null}
              {address ? (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {address}
                </p>
              ) : null}
            </div>

            {/* Line items */}
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Items
              </p>
              <div className="space-y-1">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-[12px] border border-border/50 bg-background/40 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.size} · {item.sku}
                      </p>
                    </div>
                    <span className="shrink-0 text-muted-foreground">
                      ×{item.quantity}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-sm">
                <span className="text-muted-foreground">Order total</span>
                <span className="font-semibold text-[#c9a96e]">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <PaymentStatusBadge value={order.paymentStatus} />
              </div>
            </div>

            {/* Timeline */}
            {(order.lifecycleEvents ?? []).length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Timeline
                </p>
                <div className="space-y-1.5">
                  {[...(order.lifecycleEvents ?? [])]
                    .reverse()
                    .map((event, i) => (
                      <div
                        key={i}
                        className="rounded-[12px] bg-secondary/40 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{event.status}</span>
                        {event.note ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {event.note}
                          </span>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                          {new Date(event.changedAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Right: actions ── */}
          <div className="space-y-4">
            {/* Status + primary action */}
            <div className="space-y-4 rounded-[20px] border border-border/70 bg-card/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </p>
              <StatusStepper currentStatus={order.orderStatus} />

              {showTrackingField ? (
                <FormField label="Tracking number">
                  <Input
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    placeholder="Optional"
                  />
                </FormField>
              ) : null}

              {showCODPrompt ? (
                <div className="space-y-3 rounded-[14px] border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-sm text-muted-foreground">
                    Mark COD as collected? Payment will be recorded as
                    collected.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({
                          status: "Delivered",
                          trackingNumber: trackingInput || undefined,
                          paymentStatus: draftPaymentStatus,
                        })
                      }
                      disabled={updateMutation.isPending}
                    >
                      Yes, collected
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowCODPrompt(false);
                        updateMutation.mutate({
                          status: "Delivered",
                          trackingNumber: trackingInput || undefined,
                          paymentStatus: draftPaymentStatus,
                        });
                      }}
                      disabled={updateMutation.isPending}
                    >
                      No, skip
                    </Button>
                  </div>
                </div>
              ) : null}

              {nextAction && !showCODPrompt ? (
                order.orderStatus === "Shipped" &&
                normalizePaymentStatus(order.paymentStatus) === "unpaid" ? (
                  <div className="space-y-2">
                    <Button className="w-full" disabled>
                      Mark as Delivered
                    </Button>
                    <p className="text-sm text-amber-500">
                      ⚠ Payment must be marked as Paid before this order can be
                      delivered
                    </p>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handlePrimaryAction}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Saving…" : nextAction.label}
                  </Button>
                )
              ) : null}

              {showCancelConfirm ? (
                <div className="space-y-3 rounded-[14px] border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-sm text-muted-foreground">
                    Cancel this order?{" "}
                    {order.stockApplied
                      ? "Stock committed at confirmation will be restored."
                      : "No stock changes needed."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() =>
                        updateMutation.mutate({
                          status: "Cancelled",
                          paymentStatus: draftPaymentStatus,
                        })
                      }
                      disabled={updateMutation.isPending}
                    >
                      Confirm cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={updateMutation.isPending}
                    >
                      Keep order
                    </Button>
                  </div>
                </div>
              ) : null}

              {(order.orderStatus === "Pending" ||
                order.orderStatus === "Confirmed") &&
              !showCancelConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full text-left text-sm text-destructive underline-offset-4 hover:underline"
                >
                  Cancel Order
                </button>
              ) : null}

              {updateMutation.isError ? (
                <p className="text-sm text-destructive">
                  {updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : "Action failed"}
                </p>
              ) : null}
            </div>

            {/* Payment method (non-final orders) */}
            {!isFinal ? (
              <div className="space-y-3 rounded-[20px] border border-border/70 bg-card/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Payment method
                </p>
                <Select
                  value={draftPaymentStatus}
                  onChange={(e) =>
                    setDraftPaymentStatus(e.target.value as PaymentStatus)
                  }
                >
                  {paymentOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                {paymentStatusChanged ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateMutation.mutate({
                        paymentStatus: draftPaymentStatus,
                      })
                    }
                    disabled={updateMutation.isPending}
                  >
                    Save payment method
                  </Button>
                ) : null}
              </div>
            ) : null}

            {/* Return */}
            {order.orderStatus === "Delivered" && !order.hasReturn ? (
              showReturnForm ? (
                <ReturnForm
                  order={order}
                  token={token}
                  onDone={() => setShowReturnForm(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                  onClick={() => setShowReturnForm(true)}
                >
                  Raise Return
                </Button>
              )
            ) : null}

            {order.hasReturn && order.returnInfo ? (
              <div className="rounded-[16px] border border-orange-500/20 bg-orange-500/5 p-3 text-sm">
                <p className="mb-1 font-semibold text-orange-200">
                  Return Filed
                </p>
                <p className="text-orange-100/80">{order.returnInfo.reason}</p>
                {order.returnInfo.restocked ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Items restocked
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Delete (non-final) */}
            {!isFinal ? (
              showDeleteConfirm ? (
                <div className="space-y-3 rounded-[14px] border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-sm text-muted-foreground">
                    Delete this order permanently? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      Delete order
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleteMutation.isPending}
                    >
                      Keep order
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete order
                </Button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onOpen,
  selected,
  onToggleSelect,
}: {
  order: Order;
  onOpen: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-3xl border border-l-4 border-border/70 bg-card/60 transition-colors hover:bg-card/80",
        getStatusBorderAccent(order.orderStatus),
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute left-3 top-3 z-10 h-4 w-4 cursor-pointer rounded border-border accent-[#c9a96e] transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      />
      <button
        type="button"
        onClick={onOpen}
        className="w-full p-4 pl-9 text-left"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {order.orderNumber}
            </p>
            <h3 className="mt-1 text-base font-semibold text-[#f0ede8]">
              {order.customerName}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ChannelBadge channel={order.channel} />
            <PaymentStatusBadge value={order.paymentStatus} />
            {order.hasReturn ? (
              <Badge
                variant="soft"
                className="border border-orange-500/30 bg-orange-500/10 text-[10px] leading-none text-orange-300"
              >
                Returned
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-base font-semibold text-[#c9a96e]">
            {formatCurrency(order.totalAmount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {timeAgo(order.createdAt)}
          </p>
        </div>
      </button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function OrdersView({ token }: { token: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tabParam = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey = ALL_TABS.includes(tabParam as TabKey)
    ? (tabParam as TabKey)
    : "Pending";
  const channelParam = searchParams.get("channel") ?? "";
  const paymentParam = searchParams.get("payment") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const searchParam = searchParams.get("search") ?? "";
  const pageNum = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const hasFilters = !!(
    channelParam ||
    paymentParam ||
    fromParam ||
    toParam ||
    searchParam
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParam);

  function setTab(tab: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab && tab !== "Pending") params.set("tab", tab);
    else params.delete("tab");
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setSelectedIds(new Set());
  }

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) params.delete("page");
    else params.set("page", String(newPage));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["channel", "payment", "from", "to", "search"].forEach((k) =>
      params.delete(k),
    );
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setSearchInput("");
  }

  const ordersQuery = useQuery({
    queryKey: [
      "orders",
      token,
      activeTab,
      channelParam,
      paymentParam,
      fromParam,
      toParam,
      searchParam,
      pageNum,
    ],
    queryFn: () =>
      getOrders(token, {
        orderStatus: activeTab !== "All" ? activeTab : "",
        channel: channelParam,
        paymentStatus: paymentParam,
        from: fromParam,
        to: toParam,
        search: searchParam,
        page: pageNum,
        limit: 20,
      }),
    staleTime: 30_000,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings", token],
    queryFn: () => getSettings(token),
    staleTime: 30_000,
  });

  const allOrders = ordersQuery.data?.items ?? EMPTY_ORDERS;
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = ordersQuery.data?.totalPages ?? 1;
  const settings = normalizeSettings(settingsQuery.data?.item);

  const startItem = total === 0 ? 0 : (pageNum - 1) * 20 + 1;
  const endItem = Math.min(pageNum * 20, total);

  const selectedOrder = selectedOrderId
    ? (allOrders.find((o) => o._id === selectedOrderId) ?? null)
    : null;

  const bulkMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: OrderStatus;
    }) => {
      for (const id of ids) {
        await updateOrder(token, id, { status });
      }
      return { count: ids.length, status };
    },
    onSuccess: async ({ count, status }) => {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(
        `${count} order${count !== 1 ? "s" : ""} marked as ${status}`,
      );
      setSelectedIds(new Set());
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    },
  });

  const canBulkConfirm = activeTab === "Pending" && selectedIds.size > 0;
  const canBulkShip = activeTab === "Confirmed" && selectedIds.size > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-normal">Orders</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Confirm to commit stock · Ship to dispatch · Deliver to close.
          </p>
        </div>
        <Button
          onClick={() => router.push("/orders/new")}
          className="shrink-0 gap-2"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {ALL_TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={cn(
                "rounded-2xl border px-4 py-2 text-sm transition-colors",
                isActive
                  ? "border-[#c9a96e]/50 bg-[#c9a96e]/10 font-semibold text-[#c9a96e]"
                  : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground",
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 rounded-[20px] border border-border/60 bg-card/40 p-4">
        <Input
          placeholder="Customer name or phone"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateFilter("search", searchInput);
          }}
          onBlur={() => {
            if (searchInput !== searchParam)
              updateFilter("search", searchInput);
          }}
          className="min-w-[200px] flex-1"
        />
        <Select
          value={channelParam}
          onChange={(e) => updateFilter("channel", e.target.value)}
          className="w-40"
        >
          {CHANNEL_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          value={paymentParam}
          onChange={(e) => updateFilter("payment", e.target.value)}
          className="w-36"
        >
          <option value="">All Payments</option>
          <option value="cod">COD</option>
          <option value="paid">Paid</option>
        </Select>
        <Input
          type="date"
          value={fromParam}
          onChange={(e) => updateFilter("from", e.target.value)}
          className="w-40"
          aria-label="From date"
        />
        <Input
          type="date"
          value={toParam}
          onChange={(e) => updateFilter("to", e.target.value)}
          className="w-40"
          aria-label="To date"
        />
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="self-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Order list */}
      {ordersQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-3xl bg-muted/30"
            />
          ))}
        </div>
      ) : allOrders.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {allOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onOpen={() => setSelectedOrderId(order._id)}
              selected={selectedIds.has(order._id)}
              onToggleSelect={() => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(order._id)) next.delete(order._id);
                  else next.add(order._id);
                  return next;
                });
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            activeTab === "All"
              ? "No orders yet"
              : `No ${activeTab.toLowerCase()} orders`
          }
          description={
            activeTab === "Pending"
              ? "New orders from admin or website will appear here."
              : activeTab === "All"
                ? "Orders will appear here once they are created."
                : `No orders are currently marked ${activeTab.toLowerCase()}.`
          }
        />
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {startItem}–{endItem} of {total} orders
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(pageNum - 1)}
              disabled={pageNum <= 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(pageNum + 1)}
              disabled={pageNum >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {/* Bulk actions bar */}
      {selectedIds.size > 0 ? (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-[20px] border border-border/70 bg-card/95 px-5 py-3 shadow-2xl backdrop-blur-sm">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
          {canBulkConfirm ? (
            <Button
              size="sm"
              onClick={() =>
                bulkMutation.mutate({
                  ids: [...selectedIds],
                  status: "Confirmed",
                })
              }
              disabled={bulkMutation.isPending}
            >
              {bulkMutation.isPending ? "Confirming…" : "Mark as Confirmed"}
            </Button>
          ) : null}
          {canBulkShip ? (
            <Button
              size="sm"
              onClick={() =>
                bulkMutation.mutate({
                  ids: [...selectedIds],
                  status: "Shipped",
                })
              }
              disabled={bulkMutation.isPending}
            >
              {bulkMutation.isPending ? "Shipping…" : "Mark as Shipped"}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkMutation.isPending}
          >
            Clear
          </Button>
        </div>
      ) : null}

      {selectedOrder ? (
        <OrderDetailModal
          key={selectedOrder._id}
          order={selectedOrder}
          token={token}
          settings={settings}
          onClose={() => setSelectedOrderId(null)}
        />
      ) : null}
    </div>
  );
}
