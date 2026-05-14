"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createOrder,
  getCustomers,
  getProductsWithFilters,
  type Channel,
  type Order,
  type PaymentStatus,
  type Product,
} from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/admin/primitives";

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website" },
];

const EMPTY_PRODUCTS: Product[] = [];

const emptyOrderForm = {
  customerName: "",
  phone: "",
  address: "",
  channel: "manual" as Channel,
  paymentStatus: "cod" as PaymentStatus,
  note: "",
  items: [{ productId: "", variantId: "", quantity: "1" }],
};

function buildConfirmationMessage(order: Order): string {
  const paymentLabel = order.paymentStatus === "cod" ? "COD" : "Paid";
  const lines: string[] = [
    `Hi ${order.customerName}! 🛍️`,
    `Your order #${order.orderNumber} has been received.`,
    ``,
    `Items:`,
    ...order.items.map(
      (item) =>
        `- ${item.productName} x${item.quantity} — NPR ${item.price.toLocaleString()}`,
    ),
    ``,
    `Total: NPR ${order.totalAmount.toLocaleString()}`,
    `Payment: ${paymentLabel}`,
    ``,
    `We'll confirm your order shortly. Thank you for choosing STITCH!`,
  ];
  return lines.join("\n");
}

function OrderSuccessScreen({
  order,
  onBack,
}: {
  order: Order;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = buildConfirmationMessage(order);
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [order]);

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <Check className="h-6 w-6 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-[#f0ede8]">Order created</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.orderNumber} &middot; {order.customerName}
        </p>
        <p className="mt-0.5 text-lg font-semibold text-[#c9a96e]">
          {formatCurrency(order.totalAmount)}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          This order is pending. Stock is committed when the team confirms the
          order.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleCopy} className="gap-2">
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied ✓
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Confirmation Message
            </>
          )}
        </Button>
        <Button onClick={onBack}>Back to orders</Button>
      </div>
    </div>
  );
}

export function OrderCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { token, hydrated } = useAuthStore();
  const preselectedProductId = searchParams.get("productId") || "";

  const [form, setForm] = useState(() =>
    preselectedProductId
      ? {
          ...emptyOrderForm,
          items: [
            { productId: preselectedProductId, variantId: "", quantity: "1" },
          ],
        }
      : emptyOrderForm,
  );
  const [itemSearches, setItemSearches] = useState<string[]>(() => [""]);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [phoneLookupDone, setPhoneLookupDone] = useState(false);
  const [filledFromCustomer, setFilledFromCustomer] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/");
    }
  }, [hydrated, token, router]);

  const allProductsQuery = useQuery({
    queryKey: ["products", token, "all"],
    queryFn: () => getProductsWithFilters(token!, { limit: 500 }),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      createOrder(token!, payload),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success(`Order ${data.item.orderNumber} created`);
      setCreatedOrder(data.item);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to create order",
      );
    },
  });

  const productOptions = allProductsQuery.data?.items ?? EMPTY_PRODUCTS;

  const liveTotal = useMemo(() => {
    return form.items.reduce((sum, item) => {
      if (!item.productId || !item.quantity) return sum;
      const product = productOptions.find((p) => p.id === item.productId);
      if (!product) return sum;
      return (
        sum + product.sellingPrice * Math.max(0, Number(item.quantity) || 0)
      );
    }, 0);
  }, [form.items, productOptions]);

  const validItems = useMemo(
    () =>
      form.items
        .filter((item) => item.productId && item.variantId)
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: Number(item.quantity),
        })),
    [form.items],
  );
  const canSubmit =
    form.customerName.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    validItems.length > 0;

  const updateItem = (
    index: number,
    updater: (item: (typeof form.items)[number]) => (typeof form.items)[number],
  ) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((row, i) => (i === index ? updater(row) : row)),
    }));
  };

  const handlePhoneBlur = useCallback(async () => {
    const phone = form.phone.trim();
    if (phone.length < 7 || !token || phoneLookupDone) return;

    try {
      const result = await getCustomers(token, { phone, limit: 1 });
      const found = result.items[0];
      if (found) {
        setFilledFromCustomer(found.name);
        setForm((current) => ({
          ...current,
          customerName: current.customerName || found.name,
          address: current.address || found.address || "",
        }));
      } else {
        setFilledFromCustomer(null);
      }
    } catch {
      // silently ignore lookup failure
    } finally {
      setPhoneLookupDone(true);
    }
  }, [form.phone, token, phoneLookupDone]);

  if (!hydrated || !token) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  return (
    <div className="min-h-screen bg-[#080808] p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="rounded-[30px] border border-border/70 bg-card/70 p-6 shadow-2xl">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              New order
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#f0ede8]">
              Create order
            </h1>
            <div className="mt-4 rounded-[18px] border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
              Orders are created as{" "}
              <span className="font-medium text-[#f0ede8]">Pending</span>. Stock
              is committed when the team{" "}
              <span className="font-medium text-[#f0ede8]">Confirms</span> the
              order.
            </div>
          </div>

          {createdOrder ? (
            <OrderSuccessScreen
              order={createdOrder}
              onBack={() => router.back()}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Customer name">
                  <Input
                    value={form.customerName}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        customerName: e.target.value,
                      }))
                    }
                  />
                </FormField>
                <div className="space-y-2">
                  <FormField label="Phone">
                    <Input
                      value={form.phone}
                      onChange={(e) => {
                        setPhoneLookupDone(false);
                        setFilledFromCustomer(null);
                        setForm((current) => ({
                          ...current,
                          phone: e.target.value,
                        }));
                      }}
                      onBlur={() => void handlePhoneBlur()}
                      placeholder="Looks up existing customer on blur"
                    />
                  </FormField>
                  {filledFromCustomer ? (
                    <p className="text-xs text-muted-foreground">
                      Filled from existing customer —{" "}
                      <span className="text-[#c9a96e]">
                        {filledFromCustomer}
                      </span>
                    </p>
                  ) : null}
                </div>
                <FormField label="Channel">
                  <Select
                    value={form.channel}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        channel: e.target.value as Channel,
                      }))
                    }
                  >
                    {CHANNEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Payment">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((c) => ({
                          ...c,
                          paymentStatus: "cod" as PaymentStatus,
                        }))
                      }
                      className={cn(
                        "flex-1 rounded-[14px] border py-3 text-sm font-semibold transition-colors",
                        form.paymentStatus === "cod"
                          ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-card/70",
                      )}
                    >
                      COD
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((c) => ({
                          ...c,
                          paymentStatus: "cash" as PaymentStatus,
                        }))
                      }
                      className={cn(
                        "flex-1 rounded-[14px] border py-3 text-sm font-semibold transition-colors",
                        form.paymentStatus === "cash"
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-card/70",
                      )}
                    >
                      Paid
                    </button>
                  </div>
                </FormField>
              </div>

              <FormField label="Address">
                <Textarea
                  className="min-h-[80px]"
                  value={form.address}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      address: e.target.value,
                    }))
                  }
                />
              </FormField>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Order items</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForm((current) => ({
                        ...current,
                        items: [
                          ...current.items,
                          { productId: "", variantId: "", quantity: "1" },
                        ],
                      }));
                      setItemSearches((current) => [...current, ""]);
                    }}
                  >
                    + Add Item
                  </Button>
                </div>
                {form.items.map((item, idx) => {
                  const product = productOptions.find(
                    (p) => p.id === item.productId,
                  );
                  const search = itemSearches[idx] ?? "";
                  const filteredProducts = productOptions.filter((option) => {
                    const query = search.trim().toLowerCase();
                    if (!query) return true;
                    return `${option.name} ${option.collection || ""} ${option.categoryName}`
                      .toLowerCase()
                      .includes(query);
                  });
                  const selectedVariant = product?.variants.find(
                    (v) => v.id === item.variantId,
                  );

                  return (
                    <div
                      key={idx}
                      className="space-y-4 rounded-[24px] border border-border/70 bg-background/70 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">Item {idx + 1}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              items: current.items.filter((_, i) => i !== idx),
                            }));
                            setItemSearches((current) =>
                              current.filter((_, i) => i !== idx),
                            );
                          }}
                          disabled={form.items.length === 1}
                        >
                          Remove
                        </Button>
                      </div>

                      <Input
                        value={search}
                        onChange={(e) =>
                          setItemSearches((current) =>
                            current.map((value, i) =>
                              i === idx ? e.target.value : value,
                            ),
                          )
                        }
                        placeholder="Search product by name, collection, or category"
                      />

                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredProducts.slice(0, 9).map((option) => {
                          const optionTotalStock = option.variants.reduce(
                            (sum, variant) => sum + variant.stock,
                            0,
                          );
                          const isActive = option.id === item.productId;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() =>
                                updateItem(idx, (row) => ({
                                  ...row,
                                  productId: option.id,
                                  variantId: "",
                                }))
                              }
                              className={cn(
                                "rounded-[18px] border px-3 py-3 text-left transition-colors",
                                isActive
                                  ? "border-[#c9a96e]/50 bg-[#c9a96e]/10"
                                  : "border-border/60 bg-background/60 hover:bg-card/70",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">
                                    {option.name}
                                  </p>
                                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                    {option.collection || option.categoryName}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {optionTotalStock} in stock
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {filteredProducts.length > 9 ? (
                        <p className="text-xs text-muted-foreground">
                          Showing 9 matches. Refine the search to narrow the
                          list.
                        </p>
                      ) : null}

                      {filteredProducts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No products matched this search.
                        </p>
                      ) : null}

                      {product ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Select size
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {product.variants.map((variant) => {
                                const isSelected =
                                  item.variantId === variant.id;
                                const isOutOfStock = variant.stock === 0;
                                return (
                                  <button
                                    key={variant.id}
                                    type="button"
                                    onClick={() => {
                                      if (isOutOfStock) return;
                                      updateItem(idx, (row) => ({
                                        ...row,
                                        variantId: variant.id || "",
                                      }));
                                    }}
                                    disabled={isOutOfStock}
                                    className={cn(
                                      "rounded-md border px-3 py-1 text-sm transition-colors",
                                      isSelected
                                        ? "bg-foreground text-background"
                                        : isOutOfStock
                                          ? "cursor-not-allowed border-border/50 opacity-40 line-through"
                                          : "border-border hover:bg-card/70",
                                    )}
                                  >
                                    {variant.size}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {selectedVariant ? (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                {selectedVariant.stock} in stock
                              </p>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(idx, (row) => ({
                                    ...row,
                                    quantity: e.target.value,
                                  }))
                                }
                                className="w-32"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <FormField label="Order note">
                <Textarea
                  className="min-h-[80px]"
                  value={form.note}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, note: e.target.value }))
                  }
                />
              </FormField>

              {liveTotal > 0 ? (
                <div className="flex items-center justify-between rounded-[18px] border border-[#c9a96e]/20 bg-[#c9a96e]/5 px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Order total
                  </span>
                  <span className="text-lg font-semibold text-[#c9a96e]">
                    {formatCurrency(liveTotal)}
                  </span>
                </div>
              ) : null}

              {createMutation.isError ? (
                <p className="text-sm text-destructive">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : "Failed to create order"}
                </p>
              ) : null}

              <Button
                className="w-full"
                onClick={() =>
                  createMutation.mutate({
                    customerName: form.customerName,
                    phone: form.phone,
                    address: form.address,
                    channel: form.channel,
                    paymentStatus: form.paymentStatus,
                    note: form.note,
                    items: validItems,
                  })
                }
                disabled={createMutation.isPending || !canSubmit}
              >
                {createMutation.isPending
                  ? "Creating pending order..."
                  : "Create pending order"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
