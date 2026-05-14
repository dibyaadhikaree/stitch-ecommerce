"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CirclePlus, GripVertical, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getProductsWithFilters,
  reorderProducts,
  type Category,
  type Product,
} from "@/lib/api";
import { toAssetUrl } from "@/lib/asset-url";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { EmptyState, FormField, Segmented } from "@/components/admin/primitives";

type CatalogTab = "products" | "categories";

const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_PRODUCTS: Product[] = [];
const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price_asc", label: "Price: Low–High" },
  { value: "price_desc", label: "Price: High–Low" },
  { value: "stock_asc", label: "Stock: Low–High" },
  { value: "stock_desc", label: "Stock: High–Low" },
];

function isLowStock(product: Product, defaultThreshold = 5): boolean {
  return product.variants.some(
    (v) => v.stock <= (v.lowStockThreshold ?? defaultThreshold) && v.stock > 0,
  );
}

function SortableProductCard({
  product,
  isDragDisabled,
  onEdit,
  onNewOrder,
}: {
  product: Product;
  isDragDisabled: boolean;
  onEdit: () => void;
  onNewOrder: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const primaryImage =
    product.media?.find((m) => m.isPrimary)?.url || product.media?.[0]?.url;
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const stockBadgeClass =
    totalStock > 10
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : totalStock >= 1
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";
  const stockLabel =
    totalStock > 10
      ? "In stock"
      : totalStock >= 1
        ? "Low stock"
        : "Out of stock";
  const hasLowStockVariant = isLowStock(product);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden rounded-[24px] border border-border/70 bg-background/70 text-left transition-colors hover:bg-card/80"
    >
      {/* Drag handle — top-left */}
      <div
        {...(isDragDisabled ? {} : { ...attributes, ...listeners })}
        title={isDragDisabled ? "Clear filters to reorder" : undefined}
        className={`absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/85 shadow-lg transition-all duration-200 ${
          isDragDisabled
            ? "cursor-not-allowed opacity-40"
            : "cursor-grab opacity-0 group-hover:opacity-100"
        }`}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* New order shortcut — top-right */}
      <Button
        type="button"
        size="icon"
        variant="secondary"
        onClick={onNewOrder}
        className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full border border-border/60 bg-background/85 opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100"
        title="New order"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <button type="button" onClick={onEdit} className="w-full text-left">
        <div className="aspect-[3/4] w-full bg-secondary/40">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={toAssetUrl(primaryImage)}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="space-y-4 p-4">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-lg font-semibold leading-snug">{product.name}</p>
              {hasLowStockVariant ? (
                <Badge
                  variant="soft"
                  className="shrink-0 border border-amber-500/30 bg-amber-500/10 text-[10px] leading-none text-amber-300"
                >
                  Low stock
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {product.collection || "No collection"}
            </p>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Selling price
              </p>
              <p className="mt-1 text-base font-semibold">
                {formatCurrency(product.sellingPrice)}
              </p>
            </div>
            <Badge variant="soft" className={stockBadgeClass}>
              {stockLabel}
            </Badge>
          </div>

          <div className="flex items-center justify-between rounded-[18px] border border-border/60 bg-card/40 px-3 py-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Total stock
              </p>
              <p className="mt-1 text-sm font-semibold">{totalStock}</p>
            </div>
            <p className="text-sm text-muted-foreground">{product.categoryName}</p>
          </div>
        </div>
      </button>
    </div>
  );
}

export function CatalogView({ token }: { token: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });

  const tab = (searchParams.get("catalogTab") as CatalogTab) || "products";
  const search = searchParams.get("q") ?? "";
  const category = searchParams.get("cat") ?? "";
  const collection = searchParams.get("coll") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  function syncUrl(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "newest" || (key === "page" && value === 1)) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setTab(nextTab: CatalogTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab !== "products") params.set("catalogTab", nextTab);
    else params.delete("catalogTab");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function applyFilter(key: string, value: string) {
    syncUrl({ [key]: value, page: 1 });
  }

  function clearAll() {
    syncUrl({ q: null, cat: null, coll: null, sort: null, page: 1 });
  }

  // Main paginated + filtered products query
  const productsQuery = useQuery({
    queryKey: ["products", token, "filtered", { search, category, collection, sort, page }],
    queryFn: () =>
      getProductsWithFilters(token, {
        q: search || undefined,
        category: category || undefined,
        collection: collection || undefined,
        sort: sort !== "newest" ? sort : undefined,
        page,
        limit: PAGE_SIZE,
      }),
    staleTime: 30_000,
  });

  // Separate unfiltered query just for building the collection options dropdown
  const allProductsQuery = useQuery({
    queryKey: ["products", token, "all-collections"],
    queryFn: () => getProductsWithFilters(token, { limit: 500 }),
    staleTime: 5 * 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", token],
    queryFn: () => getCategories(token),
    staleTime: 30_000,
  });

  const products = productsQuery.data?.items ?? EMPTY_PRODUCTS;
  const total = productsQuery.data?.total ?? 0;
  const totalPages = productsQuery.data?.totalPages ?? 1;
  const categoryOptions = categoriesQuery.data?.items ?? EMPTY_CATEGORIES;

  const collectionOptions = useMemo(
    () =>
      [
        ...new Set(
          (allProductsQuery.data?.items ?? EMPTY_PRODUCTS)
            .map((p) => p.collection?.trim())
            .filter(Boolean),
        ),
      ].sort() as string[],
    [allProductsQuery.data],
  );

  const hasActiveFilters = Boolean(search.trim() || category || collection || sort !== "newest");
  const activeFilterCount = [search.trim(), category, collection, sort !== "newest" ? sort : ""]
    .filter(Boolean).length;

  const showPagination = totalPages > 1;
  const rangeStart = Math.min((page - 1) * PAGE_SIZE + 1, total);
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);

  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const reorderMutation = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) =>
      reorderProducts(token, order),
    onError: () => setLocalProducts(products),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalProducts((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      reorderMutation.mutate(next.map((p, i) => ({ id: p.id, sortOrder: i * 10 })));
      return next;
    });
  }

  const categoryMutation = useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      createCategory(token, payload),
    onSuccess: async () => {
      setCategoryForm({ name: "", description: "" });
      await refresh();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(token, id),
    onSuccess: refresh,
  });

  const categoryToDelete = confirmDeleteCategoryId
    ? categoryOptions.find((c) => c._id === confirmDeleteCategoryId)
    : null;

  return (
    <>
      <AlertDialog
        open={Boolean(confirmDeleteCategoryId)}
        title="Delete category"
        description={
          categoryToDelete
            ? `Delete "${categoryToDelete.name}"? Products using this category will lose their category association.`
            : "Delete this category?"
        }
        confirmLabel="Delete"
        isPending={deleteCategoryMutation.isPending}
        onClose={() => setConfirmDeleteCategoryId(null)}
        onConfirm={() => {
          if (confirmDeleteCategoryId) {
            deleteCategoryMutation.mutate(confirmDeleteCategoryId, {
              onSuccess: () => setConfirmDeleteCategoryId(null),
            });
          }
        }}
      />
    <div className="space-y-6">
      <Segmented
        value={tab}
        onChange={(value) => setTab(value as CatalogTab)}
        items={[
          { value: "products", label: "Products" },
          { value: "categories", label: "Categories" },
        ]}
      />

      {tab === "products" ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-normal">Catalog</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Build products here, then manage stock changes from Inventory.
              </p>
            </div>
            <Button onClick={() => router.push("/products/new")}>New product</Button>
          </div>

          <Card className="rounded-[30px]">
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      Product library
                      {activeFilterCount > 0 ? (
                        <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#c9a96e]/20 text-[10px] font-semibold text-[#c9a96e]">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </CardTitle>
                    <CardDescription>
                      {productsQuery.isLoading
                        ? "Loading…"
                        : `${total} product${total !== 1 ? "s" : ""} total`}
                    </CardDescription>
                  </div>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>

                {/* Filter bar */}
                <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                  <Input
                    value={search}
                    onChange={(e) => applyFilter("q", e.target.value)}
                    placeholder="Search by product name or SKU"
                  />
                  <Select
                    value={category}
                    onChange={(e) => applyFilter("cat", e.target.value)}
                  >
                    <option value="">All categories</option>
                    {categoryOptions.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={collection}
                    onChange={(e) => applyFilter("coll", e.target.value)}
                  >
                    <option value="">All collections</option>
                    {collectionOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={sort}
                    onChange={(e) => applyFilter("sort", e.target.value)}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {productsQuery.isLoading ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-[24px] border border-border/40 bg-muted/20"
                    >
                      <div className="aspect-[3/4] bg-muted/30" />
                      <div className="space-y-2 p-4">
                        <div className="h-4 w-3/4 rounded bg-muted/40" />
                        <div className="h-3 w-1/2 rounded bg-muted/30" />
                        <div className="h-5 w-1/3 rounded bg-muted/40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : localProducts.length > 0 ? (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={localProducts.map((p) => p.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {localProducts.map((product) => (
                        <SortableProductCard
                          key={product.id}
                          product={product}
                          isDragDisabled={hasActiveFilters}
                          onEdit={() => router.push(`/products/${product.id}`)}
                          onNewOrder={() =>
                            router.push(`/orders/new?productId=${product.id}`)
                          }
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <EmptyState
                  title="No products yet — Add your first product"
                  description={
                    hasActiveFilters
                      ? "No products matched these filters. Try clearing one."
                      : "Create a product to get started."
                  }
                />
              )}

              {/* Pagination */}
              {showPagination ? (
                <div className="flex items-center justify-between border-t border-border/40 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {rangeStart}–{rangeEnd} of {total} products
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || productsQuery.isLoading}
                      onClick={() => syncUrl({ page: page - 1 })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || productsQuery.isLoading}
                      onClick={() => syncUrl({ page: page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
          <Card className="rounded-[30px]">
            <CardHeader>
              <CardTitle>Category setup</CardTitle>
              <CardDescription>
                Keep categories lean so the catalog stays easy to scan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Category name">
                <Input
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </FormField>
              <FormField label="Description">
                <Textarea
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm((c) => ({ ...c, description: e.target.value }))
                  }
                />
              </FormField>
              <Button
                className="w-full"
                onClick={() => categoryMutation.mutate(categoryForm)}
                disabled={categoryMutation.isPending || !categoryForm.name.trim()}
              >
                <CirclePlus className="h-4 w-4" />
                Add category
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[30px]">
            <CardHeader>
              <CardTitle>Existing categories</CardTitle>
              <CardDescription>
                Categories describe families of products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryOptions.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {categoryOptions.map((cat) => (
                    <div
                      key={cat._id}
                      className="rounded-[24px] border border-border/70 bg-background/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{cat.name}</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {cat.description || cat.slug}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDeleteCategoryId(cat._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No categories yet"
                  description="Add a category to organise your product catalog."
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </>
  );
}
