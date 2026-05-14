"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  correctInventoryStock,
  createInventoryStockIn,
  getInventory,
  getProducts,
  type InventoryLog,
  type Product,
} from "@/lib/api";
import { toAssetUrl } from "@/lib/asset-url";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, FormField, Segmented } from "@/components/admin/primitives";

type InventoryTab = "inventory" | "history";

const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_LOGS: InventoryLog[] = [];

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatHistoryType(type: string) {
  return type === "stock_in" ? "stock-in" : type;
}

function formatSignedQuantity(quantity: number) {
  if (quantity > 0) return `+${quantity}`;
  if (quantity < 0) return `${quantity}`;
  return "0";
}

function getDefaultDateRange() {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 30);

  return {
    from: formatDateInput(from),
    to: formatDateInput(today),
  };
}

function getHistoryTypeBadgeClass(type: string) {
  if (type === "stock_in") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (type === "initial") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (type === "adjustment") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border-border/70 bg-background/70 text-muted-foreground";
}

export function InventoryView({
  token,
  initialProductId,
}: {
  token: string;
  initialProductId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const actionRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  const [tab, setTab] = useState<InventoryTab>("inventory");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(initialProductId ?? "");
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [adjustInputs, setAdjustInputs] = useState<Record<string, string>>({});
  const [historyFilters, setHistoryFilters] = useState(() => ({
    productId: initialProductId ?? "",
    type: "",
    ...getDefaultDateRange(),
  }));

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(token),
    staleTime: 30_000,
  });

  const historyQuery = useQuery({
    queryKey: ["inventory", historyFilters],
    queryFn: () => getInventory(token, historyFilters),
    staleTime: 30_000,
  });

  const productOptions = productsQuery.data?.items ?? EMPTY_PRODUCTS;
  const selectedProduct =
    productOptions.find((product) => product.id === selectedProductId) ?? null;
  const historyItems = historyQuery.data?.items ?? EMPTY_LOGS;

  const visibleProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();

    return productOptions.filter((product) => {
      if (!q) return true;
      const label = `${product.name} ${product.collection || ""} ${product.categoryName}`.toLowerCase();
      return label.includes(q);
    });
  }, [productOptions, productSearch]);

  const stockInEntries = useMemo(() => {
    if (!selectedProduct) return [];

    return selectedProduct.variants
      .map((variant) => ({
        variantId: variant.id || "",
        quantity: Number(stockInputs[variant.id || ""] || 0),
      }))
      .filter((entry) => entry.variantId && entry.quantity > 0);
  }, [selectedProduct, stockInputs]);

  const clearWorkingInputs = () => {
    setStockInputs({});
    setAdjustInputs({});
  };

  const invalidateInventoryData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const selectProduct = (productId: string) => {
    setSelectedProductId(productId);
    clearWorkingInputs();
  };

  const stockMutation = useMutation({
    mutationFn: (payload: { productId: string; entries: { variantId: string; quantity: number }[] }) =>
      createInventoryStockIn(token, payload),
    onSuccess: async () => {
      toast.success("Stock added");
      setStockInputs({});
      await invalidateInventoryData();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add stock");
    },
  });

  const adjustmentMutation = useMutation({
    mutationFn: (payload: { productId: string; variantId: string; stock: number; note?: string }) =>
      correctInventoryStock(token, payload),
    onSuccess: async (_, variables) => {
      toast.success("Stock corrected");
      setAdjustInputs((current) => ({
        ...current,
        [variables.variantId]: "",
      }));
      await invalidateInventoryData();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to correct stock");
    },
  });

  useEffect(() => {
    if (!initialProductId || scrolledRef.current || !productsQuery.data) return;
    scrolledRef.current = true;
    const t = setTimeout(() => {
      actionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
    return () => clearTimeout(t);
  }, [productsQuery.data, initialProductId]);

  const selectedProductImage =
    selectedProduct?.media?.find((item) => item.isPrimary)?.url || selectedProduct?.media?.[0]?.url || "";
  const selectedProductTotalStock = selectedProduct
    ? selectedProduct.variants.reduce((sum, variant) => sum + variant.stock, 0)
    : 0;

  return (
    <div className="space-y-6">
      <Segmented
        value={tab}
        onChange={(value) => setTab(value as InventoryTab)}
        items={[
          { value: "inventory", label: "Inventory" },
          { value: "history", label: "History" },
        ]}
      />

      {tab === "inventory" ? (
        <div className="space-y-6">
          <Card className="rounded-[30px]">
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>Inventory overview</CardTitle>
                    <CardDescription>
                      Browse size-wise stock across all products. Click a card to open the action
                      workspace below.
                    </CardDescription>
                  </div>
                  {selectedProduct ? (
                    <div className="rounded-[18px] border border-border/60 bg-background/50 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        Active product
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#f0ede8]">
                        {selectedProduct.name}
                      </p>
                    </div>
                  ) : null}
                </div>
                <FormField label="Search product">
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by product name, collection, or category"
                  />
                </FormField>
              </div>
            </CardHeader>
            <CardContent>
              {visibleProducts.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleProducts.map((product) => {
                    const primaryImage =
                      product.media?.find((item) => item.isPrimary)?.url || product.media?.[0]?.url;
                    const isSelected = product.id === selectedProductId;
                    const totalStock = product.variants.reduce(
                      (sum, variant) => sum + variant.stock,
                      0,
                    );

                    return (
                      <div
                        key={product.id}
                        className={[
                          "flex h-full rounded-[22px] border transition-all",
                          isSelected
                            ? "border-foreground/70 bg-card shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
                            : "border-border/70 bg-background/70 hover:bg-card/80",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() => selectProduct(product.id)}
                          className="flex h-full w-full flex-col gap-3 p-3 text-left"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-[84px] w-[72px] shrink-0 overflow-hidden rounded-[16px] border border-border/60 bg-secondary/40">
                              {primaryImage ? (
                                <img
                                  src={toAssetUrl(primaryImage)}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="flex min-h-[84px] min-w-0 flex-1 flex-col justify-between">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="line-clamp-2 text-sm font-semibold leading-5">
                                    {product.name}
                                  </p>
                                  <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {product.collection || product.categoryName}
                                  </p>
                                </div>
                                {isSelected ? (
                                  <span className="shrink-0 rounded-full border border-foreground/20 bg-foreground/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
                                    Active
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <div className="rounded-[16px] border border-border/60 bg-background/50 px-3 py-2">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                    Price
                                  </p>
                                  <p className="mt-1 text-xs font-semibold">
                                    NPR {product.sellingPrice.toLocaleString()}
                                  </p>
                                </div>
                                <div className="rounded-[16px] border border-border/60 bg-background/50 px-3 py-2">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                    Total stock
                                  </p>
                                  <p className="mt-1 text-xs font-semibold">{totalStock}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col rounded-[16px] border border-border/60 bg-background/50 px-3 py-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                Variant stock
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {product.variants.length} sizes
                              </p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {product.variants.map((variant) => (
                                <div
                                  key={variant.id || `${product.id}-${variant.sku}`}
                                  className="flex items-center justify-between gap-3 rounded-[14px] border border-border/60 bg-background/70 px-3 py-2 text-[11px]"
                                >
                                  <span className="font-medium">{variant.size}</span>
                                  <span className="text-muted-foreground">{variant.stock}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No products matched your search"
                  description="Try a different product name, collection, or category."
                />
              )}
            </CardContent>
          </Card>

          <div ref={actionRef}>
          <Card className="rounded-[30px]">
            <CardHeader>
              <CardTitle>Selected product actions</CardTitle>
              <CardDescription>
                Keep browsing above, then use this focused workspace when you want to add sizes,
                stock in, or correct counts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProduct ? (
                <div className="space-y-6">
                  <div className="grid gap-5 lg:grid-cols-[160px_1fr]">
                    <div className="overflow-hidden rounded-[24px] border border-border/70 bg-background/50">
                      {selectedProductImage ? (
                        <img
                          src={toAssetUrl(selectedProductImage)}
                          alt={selectedProduct.name}
                          className="aspect-[4/5] w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[4/5] items-center justify-center text-sm text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Selected product
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-[#f0ede8]">
                            {selectedProduct.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedProduct.collection || selectedProduct.categoryName}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => router.push(`/products/${selectedProduct.id}`)}
                            className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                          >
                            View Product
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductId("");
                              clearWorkingInputs();
                            }}
                            className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                          >
                            Clear selection
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[20px] border border-border/60 bg-background/50 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Selling price
                          </p>
                          <p className="mt-2 text-lg font-semibold text-[#f0ede8]">
                            NPR {selectedProduct.sellingPrice.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-border/60 bg-background/50 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Category
                          </p>
                          <p className="mt-2 text-lg font-semibold text-[#f0ede8]">
                            {selectedProduct.categoryName}
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-border/60 bg-background/50 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Total stock
                          </p>
                          <p className="mt-2 text-lg font-semibold text-[#f0ede8]">
                            {selectedProductTotalStock}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-border/60 bg-background/45 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#f0ede8]">Current variants</p>
                          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {selectedProduct.variants.length} sizes
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {selectedProduct.variants.map((variant) => (
                            <div
                              key={`summary-${variant.id}`}
                              className="rounded-[18px] border border-border/60 bg-background/60 px-4 py-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold">{variant.size}</p>
                                <p className="text-sm font-semibold text-[#f0ede8]">
                                  {variant.stock}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{variant.sku}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Card className="rounded-[26px] border border-border/70 bg-background/30 shadow-none">
                    <CardHeader>
                      <CardTitle>Stock actions</CardTitle>
                      <CardDescription>
                        Add stock and correct counts here without leaving the selected product context.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-5 xl:grid-cols-2">
                        <div className="space-y-4 rounded-[26px] border border-emerald-500/20 bg-emerald-500/5 p-4">
                          <div>
                            <p className="text-sm font-semibold text-emerald-200">Add stock</p>
                            <p className="mt-1 text-sm text-emerald-100/70">
                              Use this to increase stock for existing sizes.
                            </p>
                          </div>

                          <div className="space-y-3">
                            {selectedProduct.variants.map((variant) => (
                              <div
                                key={`stock-in-${variant.id}`}
                                className="grid gap-4 rounded-[22px] border border-emerald-500/15 bg-background/70 p-4 md:grid-cols-[1fr_0.8fr_0.9fr]"
                              >
                                <div>
                                  <p className="text-sm font-semibold">{variant.size}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">{variant.sku}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                    Current stock
                                  </p>
                                  <p className="mt-1 text-sm font-semibold">{variant.stock}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                    Add stock
                                  </p>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={stockInputs[variant.id || ""] ?? "0"}
                                    onChange={(e) =>
                                      setStockInputs((current) => ({
                                        ...current,
                                        [variant.id || ""]: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            className="w-full"
                            onClick={() =>
                              stockMutation.mutate({
                                productId: selectedProduct.id,
                                entries: stockInEntries,
                              })
                            }
                            disabled={stockMutation.isPending || !stockInEntries.length}
                          >
                            {stockMutation.isPending ? "Submitting stock-in..." : "Submit stock-in"}
                          </Button>
                        </div>

                        <div className="space-y-4 rounded-[26px] border border-amber-500/30 bg-amber-500/10 p-4">
                          <div>
                            <p className="text-sm font-semibold text-amber-100">Correct stock</p>
                            <p className="mt-1 text-sm text-amber-50/80">
                              Use this only to fix mistakes. This sets the exact stock count.
                            </p>
                          </div>

                          <div className="space-y-3">
                            {selectedProduct.variants.map((variant) => {
                              const inputValue = adjustInputs[variant.id || ""] ?? "";
                              const parsedValue = inputValue.trim() === "" ? null : Number(inputValue);
                              const isValidTarget =
                                parsedValue !== null &&
                                Number.isFinite(parsedValue) &&
                                parsedValue >= 0;

                              return (
                                <div
                                  key={`adjustment-${variant.id}`}
                                  className="grid gap-4 rounded-[22px] border border-amber-500/20 bg-background/70 p-4 md:grid-cols-[1fr_0.8fr_0.9fr_auto]"
                                >
                                  <div>
                                    <p className="text-sm font-semibold">{variant.size}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{variant.sku}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Current stock
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">{variant.stock}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                      Correct to
                                    </p>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={inputValue}
                                      placeholder={`${variant.stock}`}
                                      onChange={(e) =>
                                        setAdjustInputs((current) => ({
                                          ...current,
                                          [variant.id || ""]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="flex flex-col justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      onClick={() =>
                                        adjustmentMutation.mutate({
                                          productId: selectedProduct.id,
                                          variantId: variant.id || "",
                                          stock: Number(parsedValue),
                                        })
                                      }
                                      disabled={
                                        adjustmentMutation.isPending ||
                                        !variant.id ||
                                        !isValidTarget ||
                                        Number(parsedValue) === variant.stock
                                      }
                                    >
                                      {adjustmentMutation.isPending ? "Saving..." : "Save correction"}
                                    </Button>
                                    <p className="text-right text-xs text-muted-foreground">
                                      Exact stock after save
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <EmptyState
                  title="Choose a product when you want to act"
                  description="Browse the stock overview above first, then click any product card to open its inventory tools here."
                />
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      ) : (
        <Card className="rounded-[30px]">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle>Inventory history</CardTitle>
                <CardDescription>
                  Review stock-in and initial inventory activity from the last 30 days.
                </CardDescription>
              </div>
              <div className="grid gap-3 lg:grid-cols-4">
                <Select
                  value={historyFilters.productId}
                  onChange={(e) =>
                    setHistoryFilters((current) => ({
                      ...current,
                      productId: e.target.value,
                    }))
                  }
                >
                  <option value="">All products</option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  value={historyFilters.from}
                  onChange={(e) =>
                    setHistoryFilters((current) => ({ ...current, from: e.target.value }))
                  }
                />
                <Input
                  type="date"
                  value={historyFilters.to}
                  onChange={(e) =>
                    setHistoryFilters((current) => ({ ...current, to: e.target.value }))
                  }
                />
                <Select
                  value={historyFilters.type}
                  onChange={(e) =>
                    setHistoryFilters((current) => ({ ...current, type: e.target.value }))
                  }
                >
                  <option value="">All types</option>
                  <option value="stock_in">stock-in</option>
                  <option value="initial">initial</option>
                  <option value="adjustment">adjustment</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {historyItems.length ? (
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {historyItems.map((item) => (
                  <div
                    key={item._id}
                    className="grid gap-4 rounded-[22px] border border-border/70 bg-background/70 px-4 py-4 md:grid-cols-[1.8fr_0.75fr_0.8fr_0.8fr_0.9fr]"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-12 overflow-hidden rounded-[14px] border border-border/60 bg-secondary/40">
                          {item.image ? (
                            <img
                              src={toAssetUrl(item.image)}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Product
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold">{item.productName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.size || item.variantLabel || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Quantity
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatSignedQuantity(item.quantity)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Type
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getHistoryTypeBadgeClass(item.type)}`}
                      >
                        {formatHistoryType(item.type)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Date
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Logged by
                      </p>
                      <p className="mt-1 text-sm font-medium">{item.loggedBy || "System"}</p>
                      {item.note ? (
                        <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No inventory history found"
                description="Try a wider date range or clear one of the filters."
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
