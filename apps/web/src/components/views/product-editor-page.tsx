"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, Boxes, GripVertical, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProductById,
  reorderProductMedia,
  updateProduct,
  uploadImage,
  type Category,
  type Product,
  type ProductMedia,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toAssetUrl } from "@/lib/asset-url";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Segmented, FormField } from "@/components/admin/primitives";

type ProductEditorMode = "create" | "edit";
type ProductPageTab = "info" | "variants";

type ProductVariantDraft = {
  id?: string;
  size: string;
  sku: string;
  stock: string;
  sold?: number;
};

type NewVariantDraft = {
  size: string;
  sku: string;
  stock: string;
};

type ProductFormState = {
  id?: string;
  name: string;
  categoryId: string;
  collection: string;
  costPrice: string;
  sellingPrice: string;
  marketPrice: string;
  media: ProductMedia[];
  variants: ProductVariantDraft[];
};

const EMPTY_CATEGORIES: Category[] = [];
const CREATE_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"] as const;

const emptyProduct: ProductFormState = {
  name: "",
  categoryId: "",
  collection: "",
  costPrice: "",
  sellingPrice: "",
  marketPrice: "",
  media: [],
  variants: [{ size: "", sku: "", stock: "0" }],
};

function buildCreatePayload(form: ProductFormState) {
  return {
    name: form.name.trim(),
    categoryId: form.categoryId,
    collection: form.collection.trim(),
    costPrice: Number(form.costPrice || 0),
    sellingPrice: Number(form.sellingPrice || 0),
    marketPrice: Number(form.marketPrice || 0),
    media: form.media,
    variants: form.variants
      .filter((variant) => variant.size.trim())
      .map((variant) => ({
        size: variant.size.trim(),
        sku: variant.sku.trim(),
        stock: Number(variant.stock || 0),
      })),
  };
}

function buildEditPayload(form: ProductFormState, newVariants: NewVariantDraft[]) {
  return {
    name: form.name.trim(),
    categoryId: form.categoryId,
    collection: form.collection.trim(),
    costPrice: Number(form.costPrice || 0),
    sellingPrice: Number(form.sellingPrice || 0),
    marketPrice: Number(form.marketPrice || 0),
    media: form.media,
    newVariants: newVariants
      .filter((variant) => variant.size.trim())
      .map((variant) => ({
        size: variant.size.trim(),
        sku: variant.sku.trim(),
        stock: Number(variant.stock || 0),
      })),
  };
}

function toEditForm(product: Product): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    collection: product.collection || "",
    costPrice: String(product.costPrice),
    sellingPrice: String(product.sellingPrice),
    marketPrice: String(product.marketPrice || 0),
    media: product.media,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      sku: variant.sku,
      stock: String(variant.stock),
      sold: variant.sold,
    })),
  };
}

function normalizeVariantSize(size: string) {
  return size.trim().toLowerCase();
}

export function ProductEditorPage({
  mode,
  productId,
}: {
  mode: ProductEditorMode;
  productId?: string;
}) {
  const router = useRouter();
  const { token, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/");
    }
  }, [hydrated, token, router]);

  const categoriesQuery = useQuery({
    queryKey: ["categories", token],
    queryFn: () => getCategories(token!),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(token!, productId!),
    enabled: Boolean(token && mode === "edit" && productId),
    staleTime: 30_000,
  });

  if (!hydrated || !token) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  const categoryOptions = categoriesQuery.data?.items ?? EMPTY_CATEGORIES;

  if (mode === "edit" && !productQuery.data?.item) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  const initialForm =
    mode === "edit" && productQuery.data?.item ? toEditForm(productQuery.data.item) : emptyProduct;

  return (
    <ProductEditorForm
      key={mode === "edit" ? productId : "new-product"}
      token={token}
      mode={mode}
      productId={productId}
      categories={categoryOptions}
      initialForm={initialForm}
      product={productQuery.data?.item}
    />
  );
}

function SortableMediaCard({
  item,
  index,
  onTagChange,
  onSetPrimary,
  onRemove,
}: {
  item: ProductMedia;
  index: number;
  onTagChange: (tag: ProductMedia["tag"]) => void;
  onSetPrimary: () => void;
  onRemove: () => void;
}) {
  const id = item._id ?? item.url;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex flex-col gap-1.5">
      <div
        className="relative overflow-hidden rounded-[12px] border border-border/70"
        style={{ aspectRatio: "4/5" }}
      >
        <img
          src={toAssetUrl(item.url)}
          alt={`Media ${index + 1}`}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          {...listeners}
          className="absolute left-2 top-2 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded bg-black/50 text-white/70 hover:text-white active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {item.isPrimary && (
          <span className="absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-[#c9a96e] text-[#080808]">
            Primary
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground"># {(item.sortOrder ?? index) + 1}</p>

      <Select
        value={item.tag || "untagged"}
        onChange={(e) => onTagChange(e.target.value as ProductMedia["tag"])}
      >
        <option value="front">Front</option>
        <option value="back">Back</option>
        <option value="detail">Detail</option>
        <option value="lifestyle">Lifestyle</option>
        <option value="untagged">Untagged</option>
      </Select>

      <div className="flex gap-1">
        {!item.isPrimary && (
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={onSetPrimary}>
            Set primary
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
        >
          ✕
        </Button>
      </div>
    </div>
  );
}

function ProductEditorForm({
  token,
  mode,
  productId,
  categories,
  initialForm,
  product,
}: {
  token: string;
  mode: ProductEditorMode;
  productId?: string;
  categories: Category[];
  initialForm: ProductFormState;
  product?: Product;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [newVariants, setNewVariants] = useState<NewVariantDraft[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<ProductPageTab>("info");
  const [touchedNewVariantIndices, setTouchedNewVariantIndices] = useState<Set<number>>(new Set());
  const [uploadingFiles, setUploadingFiles] = useState<
    { id: string; name: string; status: "uploading" | "done" | "error" }[]
  >([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [orderSaveState, setOrderSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["product", productId] }),
    ]);
  };

  const mediaReorderMutation = useMutation({
    mutationFn: (newMedia: ProductMedia[]) =>
      reorderProductMedia(
        token,
        form.id!,
        newMedia.map((m, i) => ({
          _id:       m._id,
          sortOrder: i,
          tag:       m.tag,
          isPrimary: m.isPrimary,
        })),
      ),
    onMutate: () => setOrderSaveState("saving"),
    onSuccess: (data) => {
      setForm((current) => ({ ...current, media: data.product.media }));
      setOrderSaveState("saved");
      setTimeout(() => setOrderSaveState("idle"), 2500);
    },
    onError: (err) => {
      setOrderSaveState("idle");
      toast.error(err instanceof Error ? err.message : "Failed to save media order");
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = form.media.findIndex((m) => (m._id ?? m.url) === active.id);
    const newIndex = form.media.findIndex((m) => (m._id ?? m.url) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(form.media, oldIndex, newIndex).map((m, i) => ({
      ...m,
      sortOrder: i,
    }));
    setForm((current) => ({ ...current, media: reordered }));
    if (mode === "edit" && form.id) {
      mediaReorderMutation.mutate(reordered);
    }
  }

  const handleUploadFiles = async (files: File[]) => {
    const entries = files.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: f.name,
      status: "uploading" as const,
    }));
    setUploadingFiles((prev) => [...prev, ...entries]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const entry = entries[i];
      try {
        const data = await uploadImage(token, file);
        setUploadingFiles((prev) =>
          prev.map((s) => (s.id === entry.id ? { ...s, status: "done" } : s)),
        );
        setForm((current) => {
          const len = current.media.length;
          return {
            ...current,
            media: [
              ...current.media,
              {
                url:          data.item.url,
                type:         "image" as const,
                tag:          "untagged" as const,
                isPrimary:    len === 0,
                sortOrder:    len,
                originalName: data.item.originalName || file.name,
              },
            ],
          };
        });
      } catch {
        setUploadingFiles((prev) =>
          prev.map((s) => (s.id === entry.id ? { ...s, status: "error" } : s)),
        );
      }
    }
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      mode === "create"
        ? createProduct(token, buildCreatePayload(form))
        : updateProduct(token, form.id!, buildEditPayload(form, newVariants)),
    onSuccess: async (response) => {
      await refresh();
      if (mode === "create") {
        toast.success("Product created");
        router.push(`/products/${response.item.id}`);
        return;
      }
      toast.success("Product saved");
      setNewVariants([]);
      router.refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(token, form.id!),
    onSuccess: async () => {
      await refresh();
      toast.success("Product deleted");
      router.push("/catalog");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete product");
    },
  });

  const primaryMedia = form.media.find((m) => m.isPrimary) ?? form.media[0] ?? null;
  const cost = Number(form.costPrice || 0);
  const selling = Number(form.sellingPrice || 0);
  const margin =
    selling > 0 && selling > cost ? Math.round(((selling - cost) / selling) * 100) : 0;
  const hasValidVariants =
    mode === "edit" ||
    form.variants.some((variant) => variant.size.trim() && Number(variant.stock || 0) >= 0);
  const totalStock = form.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const duplicateNewVariantIndexes = useMemo(() => {
    const duplicates = new Set<number>();
    const existingSizes = new Set(form.variants.map((variant) => normalizeVariantSize(variant.size)));
    const pendingSizes = new Map<string, number>();

    newVariants.forEach((variant, index) => {
      const normalizedSize = normalizeVariantSize(variant.size);
      if (!normalizedSize) return;

      if (existingSizes.has(normalizedSize)) {
        duplicates.add(index);
      }

      const firstIndex = pendingSizes.get(normalizedSize);
      if (firstIndex !== undefined) {
        duplicates.add(firstIndex);
        duplicates.add(index);
        return;
      }

      pendingSizes.set(normalizedSize, index);
    });

    return duplicates;
  }, [form.variants, newVariants]);
  const hasInvalidNewVariantStock = newVariants.some((variant) => {
    if (variant.stock === "") return false;
    const stock = Number(variant.stock);
    return !Number.isFinite(stock) || stock < 0;
  });
  const canSaveProduct =
    !saveMutation.isPending &&
    !!form.name.trim() &&
    !!form.categoryId &&
    !!form.costPrice &&
    !!form.sellingPrice &&
    !!hasValidVariants &&
    !hasInvalidNewVariantStock &&
    !duplicateNewVariantIndexes.size;

  return (
    <>
      <AlertDialog
        open={confirmDelete}
        title="Delete product"
        description={`Permanently delete "${form.name || "this product"}"? This cannot be undone.`}
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    <div className="min-h-screen bg-[#080808] p-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="rounded-[30px] border border-border/70 bg-card/70 p-6 shadow-2xl">
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {mode === "create" ? "Create product" : "Product detail"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#f0ede8]">
                {mode === "create" ? "New catalog item" : form.name || "Update product"}
              </h1>
              {mode === "edit" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {form.collection || "No collection"} /{" "}
                  {categories.find((category) => category._id === form.categoryId)?.name ||
                    product?.categoryName ||
                    "Uncategorized"}
                </p>
              ) : null}
            </div>

            {mode === "edit" ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => router.push(`/inventory?productId=${form.id}`)}
              >
                <Boxes className="h-4 w-4" />
                Show inventory
              </Button>
            ) : null}
          </div>

          {mode === "edit" ? (
            <div className="mb-6 grid gap-5 lg:grid-cols-[320px_1fr]">
              <div className="overflow-hidden rounded-[24px] border border-border/70 bg-background/50">
                {primaryMedia ? (
                  <img
                    src={toAssetUrl(primaryMedia.url)}
                    alt={form.name}
                    className="aspect-[4/5] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center text-sm text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-border/70 bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Selling price
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[#f0ede8]">
                    {formatCurrency(selling)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/70 bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Cost price
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[#f0ede8]">
                    {formatCurrency(cost)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-border/70 bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Margin
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[#f0ede8]">{margin}%</p>
                </div>
                <div className="rounded-[22px] border border-border/70 bg-background/40 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Total stock
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[#f0ede8]">{totalStock}</p>
                  {form.variants.length ? (
                    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                      {form.variants.map((variant) => (
                        <div
                          key={variant.id || variant.sku || variant.size}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="text-muted-foreground">{variant.size}</span>
                          <span className="font-medium text-[#f0ede8]">{variant.stock}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {mode === "edit" ? (
            <div className="mb-6">
              <Segmented
                value={activeTab}
                onChange={(value) => setActiveTab(value as ProductPageTab)}
                items={[
                  { value: "info", label: "Product Info" },
                  { value: "variants", label: "Variants" },
                ]}
              />
            </div>
          ) : null}

          {mode === "create" || activeTab === "info" ? (
            <div className="space-y-5">
              <FormField label="Product name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                />
              </FormField>

              <FormField label="Category *">
                <Select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, categoryId: e.target.value }))
                  }
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Cost price in NPR">
                <Input
                  type="number"
                  value={form.costPrice}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, costPrice: e.target.value }))
                  }
                />
              </FormField>

              <div>
                <FormField label="Selling price in NPR">
                  <Input
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, sellingPrice: e.target.value }))
                    }
                  />
                </FormField>
                <p className="mt-2 text-sm text-muted-foreground">Margin: {margin}%</p>
              </div>

              <div>
                <FormField label="Compare-at price (NPR)">
                  <Input
                    type="number"
                    value={form.marketPrice}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, marketPrice: e.target.value }))
                    }
                  />
                </FormField>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Set higher than selling price to show a strikethrough sale price on the storefront. Leave at 0 or equal to selling price for no sale.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold">Images</p>
                  {mode === "edit" && orderSaveState === "saving" && (
                    <span className="text-xs text-muted-foreground">Saving order…</span>
                  )}
                  {mode === "edit" && orderSaveState === "saved" && (
                    <span className="text-xs text-[#c9a96e]">Saved</span>
                  )}
                </div>

                {/* Drop zone */}
                <div
                  role="button"
                  tabIndex={0}
                  className={[
                    "flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed bg-background/50 p-6 transition-colors",
                    isDragOver ? "border-border" : "border-border/50",
                  ].join(" ")}
                  style={{ minHeight: 100 }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const files = Array.from(e.dataTransfer.files).filter((f) =>
                      f.type.startsWith("image/"),
                    );
                    if (files.length) void handleUploadFiles(files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                >
                  <Upload className="mb-2 h-4 w-4 text-muted-foreground" />
                  <p className="text-center text-sm text-muted-foreground">
                    Drop images here or click to upload — no minimum required
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length) void handleUploadFiles(files);
                      e.target.value = "";
                    }}
                  />
                </div>

                {/* Per-file upload status */}
                {uploadingFiles.length > 0 && (
                  <div className="space-y-1">
                    {uploadingFiles.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate text-muted-foreground">{entry.name}</span>
                        {entry.status === "uploading" && (
                          <span className="text-xs text-muted-foreground">uploading…</span>
                        )}
                        {entry.status === "done" && (
                          <span className="text-xs text-green-500">✓</span>
                        )}
                        {entry.status === "error" && (
                          <span className="text-xs text-destructive">✗ failed</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Image grid */}
                {form.media.length > 0 && (
                  <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <SortableContext
                      items={form.media.map((m) => m._id ?? m.url)}
                      strategy={rectSortingStrategy}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                          gap: 12,
                        }}
                      >
                        {form.media.map((item, index) => (
                          <SortableMediaCard
                            key={item._id || item.url || String(index)}
                            item={item}
                            index={index}
                            onTagChange={(tag) =>
                              setForm((current) => ({
                                ...current,
                                media: current.media.map((m, mi) =>
                                  mi === index ? { ...m, tag } : m,
                                ),
                              }))
                            }
                            onSetPrimary={() =>
                              setForm((current) => ({
                                ...current,
                                media: current.media.map((m, mi) => ({
                                  ...m,
                                  isPrimary: mi === index,
                                })),
                              }))
                            }
                            onRemove={() =>
                              setForm((current) => {
                                const filtered = current.media.filter((_, mi) => mi !== index);
                                const renumbered = filtered.map((m, mi) => ({
                                  ...m,
                                  sortOrder: mi,
                                }));
                                if (
                                  item.isPrimary &&
                                  renumbered.length > 0 &&
                                  !renumbered.some((m) => m.isPrimary)
                                ) {
                                  renumbered[0] = { ...renumbered[0], isPrimary: true };
                                }
                                return { ...current, media: renumbered };
                              })
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Variants</p>
                  {mode === "create" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          variants: [...current.variants, { size: "", sku: "", stock: "0" }],
                        }))
                      }
                    >
                      Add size
                    </Button>
                  ) : null}
                </div>

                {mode === "create"
                  ? form.variants.map((variant, index) => (
                      <div
                        key={`variant-${index}`}
                        className="space-y-3 rounded-[24px] border border-border/70 bg-background/70 p-4"
                      >
                        <div className="space-y-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Select size
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {CREATE_SIZE_OPTIONS.map((sizeOption) => {
                              const isSelected = variant.size === sizeOption;

                              return (
                                <button
                                  key={`${index}-${sizeOption}`}
                                  type="button"
                                  onClick={() =>
                                    setForm((current) => ({
                                      ...current,
                                      variants: current.variants.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, size: sizeOption }
                                          : item,
                                      ),
                                    }))
                                  }
                                  className={[
                                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                    isSelected
                                      ? "border-[#c9a96e]/40 bg-[#c9a96e]/12 text-[#f0ede8]"
                                      : "border-border/70 bg-background/60 text-muted-foreground hover:bg-card/80 hover:text-foreground",
                                  ].join(" ")}
                                >
                                  {sizeOption}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                          <Input
                            type="number"
                            min="0"
                            placeholder="Initial stock"
                            value={variant.stock}
                            onChange={(e) =>
                              setForm((current) => ({
                                ...current,
                                variants: current.variants.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, stock: e.target.value } : item,
                                ),
                              }))
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                variants: current.variants.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              }))
                            }
                            disabled={form.variants.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))
                  : (
                      <div className="rounded-[22px] border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                        Variant stock is shown in the Variants tab. Use Inventory to change stock
                        counts.
                      </div>
                    )}
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => saveMutation.mutate()}
                  disabled={!canSaveProduct}
                >
                  {saveMutation.isPending
                    ? mode === "create"
                      ? "Creating product..."
                      : "Saving..."
                    : mode === "create"
                      ? "Create product"
                      : "Save changes"}
                </Button>

                {mode === "edit" ? (
                  <div className="space-y-3 border-t border-border/60 pt-3">
                    <Button
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete product
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {form.variants.map((variant) => (
                  <div
                    key={variant.id || variant.sku || variant.size}
                    className="rounded-[24px] border border-border/70 bg-background/50 p-4"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Size
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#f0ede8]">{variant.size}</p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">SKU</span>
                        <span className="font-medium text-[#f0ede8]">{variant.sku}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Current stock</span>
                        <span className="text-lg font-semibold text-[#f0ede8]">
                          {variant.stock}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Units sold</span>
                        <span className="font-medium text-[#f0ede8]">{variant.sold ?? 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!form.variants.length ? (
                <div className="rounded-[24px] border border-border/70 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                  No variants found for this product.
                </div>
              ) : null}

              <div className="rounded-[24px] border border-border/70 bg-background/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#f0ede8]">Add new sizes</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add new variants here. Existing stock stays read-only on this page.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setNewVariants((current) => [...current, { size: "", sku: "", stock: "0" }])
                    }
                  >
                    Add size
                  </Button>
                </div>

                {newVariants.length ? (
                  <div className="mt-4 space-y-3">
                    {newVariants.map((variant, index) => {
                      const hasDuplicate = duplicateNewVariantIndexes.has(index);
                      const stockValue = Number(variant.stock);
                      const hasStockError =
                        variant.stock !== "" && (!Number.isFinite(stockValue) || stockValue < 0);

                      return (
                        <div
                          key={`new-variant-${index}`}
                          className="space-y-3 rounded-[22px] border border-border/70 bg-background/70 p-4"
                        >
                          <div className="space-y-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Select size
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {CREATE_SIZE_OPTIONS.map((sizeOption) => {
                                const isSelected = variant.size === sizeOption;

                                return (
                                  <button
                                    key={`new-${index}-${sizeOption}`}
                                    type="button"
                                    onClick={() => {
                                      setNewVariants((current) =>
                                        current.map((item, itemIndex) =>
                                          itemIndex === index
                                            ? { ...item, size: sizeOption }
                                            : item,
                                        ),
                                      );
                                      setTouchedNewVariantIndices(
                                        (prev) => new Set([...prev, index]),
                                      );
                                    }}
                                    className={[
                                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                      isSelected
                                        ? "border-[#c9a96e]/40 bg-[#c9a96e]/12 text-[#f0ede8]"
                                        : "border-border/70 bg-background/60 text-muted-foreground hover:bg-card/80 hover:text-foreground",
                                    ].join(" ")}
                                  >
                                    {sizeOption}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_auto]">
                            <Input
                              placeholder="SKU (optional)"
                              value={variant.sku}
                              onChange={(e) =>
                                setNewVariants((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, sku: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                            <Input
                              type="number"
                              min="0"
                              placeholder="Initial stock"
                              value={variant.stock}
                              onChange={(e) =>
                                setNewVariants((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, stock: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNewVariants((current) =>
                                  current.filter((_, itemIndex) => itemIndex !== index),
                                );
                                setTouchedNewVariantIndices(new Set());
                              }}
                            >
                              Remove
                            </Button>
                          </div>

                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span>SKU will be auto-generated if left blank.</span>
                            {hasDuplicate && touchedNewVariantIndices.has(index) ? (
                              <span className="text-destructive">
                                Size {variant.size.trim().toUpperCase()} already added
                              </span>
                            ) : null}
                            {hasStockError ? (
                              <span className="text-destructive">
                                Initial stock must be 0 or greater.
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[20px] border border-dashed border-border/70 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
                    No new sizes staged yet.
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!canSaveProduct}>
                {saveMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
