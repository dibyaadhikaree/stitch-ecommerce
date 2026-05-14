'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronUp, ImageOff, X, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { toAssetUrl } from '@/lib/asset-url'
import { formatCurrency } from '@/lib/utils'
import { EmptyState, MiniStat } from '@/components/admin/primitives'
import { Button } from '@/components/ui/button'
import {
  getStorefrontConfig,
  getProducts,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  reorderCollections,
  setCollectionProducts,
  updateAnnouncement,
  updateFeaturedTitle,
  addHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  reorderFeaturedProducts,
  toggleProductFeatured,
  setProductShopVisibility,
  reorderProducts,
  uploadImage,
  type HeroSlide,
  type Product,
  type Collection,
} from '@/lib/api'

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-medium text-[#f0ede8]">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-[#555]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-[#c9a96e]' : 'bg-[#333]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ── SlideForm (shared by Add + Edit) ─────────────────────────────────────────

const BLANK_SLIDE: Omit<HeroSlide, '_id'> = {
  image: '',
  videoUrl: '',
  title: '',
  subtitle: '',
  ctaText: 'Shop Now',
  ctaLink: '',
  isActive: true,
  sortOrder: 0,
}

function SlideForm({
  token,
  initial,
  label,
  onSave,
  onCancel,
  isSaving,
}: {
  token: string
  initial: Omit<HeroSlide, '_id'>
  label: string
  onSave: (data: Omit<HeroSlide, '_id'>) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<Omit<HeroSlide, '_id'>>(initial)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadImage(token, file)
      setForm(f => ({ ...f, image: res.item.url }))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const canSave = form.title.trim() !== '' && form.image !== ''

  return (
    <div className="border border-[#1e1e1e] bg-[#0f0f0f] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-[#f0ede8]">{label}</span>
        <button
          type="button"
          onClick={onCancel}
          className="text-[#555] transition-colors hover:text-[#f0ede8]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Image upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <div className="mb-4">
        {form.image ? (
          <div className="relative">
            <img
              src={toAssetUrl(form.image)}
              alt=""
              className="aspect-video w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, image: '' }))}
              className="absolute right-2 top-2 bg-black/70 px-2 py-0.5 text-[11px] text-[#f0ede8] hover:bg-black"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[#333] bg-[#0a0a0a] text-[#555] transition-colors hover:border-[#555] hover:text-[#f0ede8] disabled:opacity-50"
          >
            <ImageOff className="h-5 w-5" />
            <span className="text-xs">{uploading ? 'Uploading…' : 'Upload hero image'}</span>
          </button>
        )}
      </div>

      {/* Video URL */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Video URL (optional) — overrides image when set"
          value={form.videoUrl ?? ''}
          onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
          className="w-full border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
        />
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Title (required) — e.g. New Season"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
        />
        <input
          type="text"
          placeholder="Subtitle — e.g. SS 2025"
          value={form.subtitle}
          onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
          className="w-full border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
        />
        <input
          type="text"
          placeholder="CTA Text — e.g. Shop Now"
          value={form.ctaText}
          onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
          className="w-full border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
        />
        <input
          type="text"
          placeholder="CTA Link — e.g. /shop or /collections/summer"
          value={form.ctaLink}
          onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))}
          className="w-full border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
        />
        <label className="flex cursor-pointer items-center gap-3">
          <Toggle
            checked={form.isActive}
            onChange={v => setForm(f => ({ ...f, isActive: v }))}
          />
          <span className="text-sm text-[#555]">Active on storefront</span>
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!canSave || isSaving}
          onClick={() => canSave && onSave(form)}
        >
          {isSaving ? 'Saving…' : 'Save slide'}
        </Button>
      </div>
    </div>
  )
}

// ── Sortable featured product card ────────────────────────────────────────────

function SortableFeaturedCard({
  product,
  onToggle,
  isToggling,
}: {
  product: Product
  onToggle: () => void
  isToggling: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `featured-${product._id}` })

  const primaryImg = product.media.find(m => m.isPrimary)?.url ?? product.media[0]?.url

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 border border-[#1e1e1e] bg-[#0f0f0f] p-2"
    >
      <button
        type="button"
        className="cursor-grab text-[#444] hover:text-[#555] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="h-12 w-12 shrink-0 overflow-hidden bg-[#0a0a0a]">
        {primaryImg && (
          <img
            src={toAssetUrl(primaryImg)}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#f0ede8]">{product.name}</p>
        <p className="mt-0.5 text-[11px] text-[#555]">{formatCurrency(product.sellingPrice)}</p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={isToggling}
        className="shrink-0 px-3 py-1 text-[11px] transition-colors disabled:opacity-50 bg-[#c9a96e]/10 text-[#c9a96e] hover:bg-[#c9a96e]/20"
      >
        ★ Featured
      </button>
    </div>
  )
}

// ── Sortable shop visibility card ─────────────────────────────────────────────

function SortableShopCard({
  product,
  onToggle,
  isToggling,
}: {
  product: Product
  onToggle: () => void
  isToggling: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `shop-${product._id}` })

  const primaryImg = product.media.find(m => m.isPrimary)?.url ?? product.media[0]?.url

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 border border-[#1e1e1e] bg-[#0f0f0f] p-2"
    >
      <button
        type="button"
        className="cursor-grab text-[#444] hover:text-[#555] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="h-10 w-10 shrink-0 overflow-hidden bg-[#0a0a0a]">
        {primaryImg && (
          <img
            src={toAssetUrl(primaryImg)}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#f0ede8]">{product.name}</p>
        <p className="mt-0.5 text-[11px] text-[#555]">{formatCurrency(product.sellingPrice)}</p>
      </div>

      <Toggle checked onChange={onToggle} disabled={isToggling} />
    </div>
  )
}

// ── Collection form ───────────────────────────────────────────────────────────

type CollectionFormData = { name: string; description: string; coverImage: string }

function CollectionForm({
  token,
  initial,
  label,
  onSave,
  onCancel,
  isSaving,
}: {
  token: string
  initial: CollectionFormData
  label: string
  onSave: (data: CollectionFormData) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<CollectionFormData>(initial)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadImage(token, file)
      setForm(f => ({ ...f, coverImage: res.item.url }))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const canSave = form.name.trim() !== ''

  return (
    <div className="border border-[#1e1e1e] bg-[#0f0f0f] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-[#f0ede8]">{label}</span>
        <button type="button" onClick={onCancel} className="text-[#555] transition-colors hover:text-[#f0ede8]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Cover image upload */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="mb-4">
        {form.coverImage ? (
          <div className="relative">
            <img src={toAssetUrl(form.coverImage)} alt="" className="h-28 w-full object-cover" />
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, coverImage: '' }))}
              className="absolute right-2 top-2 bg-black/70 px-2 py-0.5 text-[11px] text-[#f0ede8] hover:bg-black"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[#333] bg-[#0a0a0a] text-[#555] transition-colors hover:border-[#555] hover:text-[#f0ede8] disabled:opacity-50"
          >
            <ImageOff className="h-5 w-5" />
            <span className="text-xs">{uploading ? 'Uploading…' : 'Upload cover image (optional)'}</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Name (required) — e.g. Summer Collection"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" disabled={!canSave || isSaving} onClick={() => canSave && onSave(form)}>
          {isSaving ? 'Saving…' : 'Save collection'}
        </Button>
      </div>
    </div>
  )
}

// ── Sortable collection row ───────────────────────────────────────────────────

function SortableCollectionRow({
  collection,
  onToggle,
  onEdit,
  onDelete,
  onManageProducts,
  isExpanded,
  isUpdating,
}: {
  collection: Collection
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onManageProducts: () => void
  isExpanded: boolean
  isUpdating: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `coll-${collection._id}` })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="border border-[#1e1e1e] bg-[#0f0f0f] p-3"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab text-[#444] hover:text-[#555] active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="h-12 w-12 shrink-0 overflow-hidden bg-[#0a0a0a]">
          {collection.coverImage ? (
            <img
              src={toAssetUrl(collection.coverImage)}
              alt={collection.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-3.5 w-3.5 text-[#333]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#f0ede8]">{collection.name}</p>
          {collection.description && (
            <p className="mt-0.5 truncate text-[11px] text-[#555]">{collection.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Toggle checked={collection.isActive} onChange={onToggle} disabled={isUpdating} />
          <button
            type="button"
            onClick={onEdit}
            className="px-2 py-1 text-xs text-[#555] transition-colors hover:text-[#f0ede8]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-2 py-1 text-xs text-[#e05252] transition-colors hover:text-[#ff7070]"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onManageProducts}
          className="inline-flex items-center gap-2 px-2 py-1 text-xs text-[#555] transition-colors hover:text-[#f0ede8]"
        >
          <span>Manage products</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function StorefrontView({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const sfKey = ['storefront', token]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: sfKey,
    queryFn: () => getStorefrontConfig(token),
    enabled: !!token,
  })

  const productsQuery = useQuery({
    queryKey: ['products', token],
    queryFn: () => getProducts(token),
    enabled: !!token,
  })

  const collectionsQuery = useQuery({
    queryKey: ['collections', token],
    queryFn: () => getCollections(token),
    enabled: !!token,
  })

  // ── Form state ───────────────────────────────────────────────────────────────

  const [annForm, setAnnForm] = useState({ text: '', isActive: false, link: '' })
  const [annSaved, setAnnSaved] = useState(false)

  useEffect(() => {
    // Keep the editable form in sync with the latest fetched config.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data?.config?.announcementBar) setAnnForm(data.config.announcementBar)
  }, [data])

  const [featuredTitle, setFeaturedTitle] = useState('')
  const [titleSaved, setTitleSaved] = useState(false)

  useEffect(() => {
    if (data?.config?.featuredSectionTitle !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFeaturedTitle(data.config.featuredSectionTitle)
    }
  }, [data])

  // ── Featured product order (local optimistic state for DnD) ─────────────────

  const [featuredIds, setFeaturedIds] = useState<string[]>([])

  useEffect(() => {
    const allProducts = productsQuery.data?.items ?? []
    const featured = allProducts.filter(p => p.featured)
    let order = data?.config?.featuredProductOrder ?? []
    // Bootstrap: append any featured products not already in the order array
    const featuredIdsList = featured.map(p => p._id)
    const missingIds = featuredIdsList.filter(id => !order.includes(id))
    if (missingIds.length > 0) {
      order = [...order, ...missingIds]
    }
    const sorted = [...featured].sort((a, b) => {
      const ai = order.indexOf(a._id)
      const bi = order.indexOf(b._id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFeaturedIds(sorted.map(p => p._id))
  }, [productsQuery.data, data])

  // ── Hero slide UI state ──────────────────────────────────────────────────────

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSlide, setEditingSlide] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // ── Collections UI state ─────────────────────────────────────────────────────

  const [showAddCollForm, setShowAddCollForm] = useState(false)
  const [editingColl, setEditingColl] = useState<string | null>(null)
  const [confirmDeleteColl, setConfirmDeleteColl] = useState<string | null>(null)
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null)
  const [selectedCollectionProductIds, setSelectedCollectionProductIds] = useState<string[]>([])
  const [savedCollectionId, setSavedCollectionId] = useState<string | null>(null)
  const [collectionIds, setCollectionIds] = useState<string[]>([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollectionIds((collectionsQuery.data?.items ?? []).map(c => c._id))
  }, [collectionsQuery.data])

  // ── Shop visibility order (local optimistic state for DnD) ───────────────────

  const [shopVisibleIds, setShopVisibleIds] = useState<string[]>([])

  useEffect(() => {
    const allProducts = productsQuery.data?.items ?? []
    const visible = allProducts
      .filter(p => p.shopVisible)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShopVisibleIds(visible.map(p => p._id))
  }, [productsQuery.data])

  // ── Last saved ───────────────────────────────────────────────────────────────

  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const markSaved = () => setLastSaved(new Date())

  // ── Mutations ────────────────────────────────────────────────────────────────

  const annMutation = useMutation({
    mutationFn: (f: typeof annForm) => updateAnnouncement(token, f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sfKey })
      setAnnSaved(true)
      markSaved()
      setTimeout(() => setAnnSaved(false), 2000)
    },
  })

  const titleMutation = useMutation({
    mutationFn: (t: string) => updateFeaturedTitle(token, t),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sfKey })
      setTitleSaved(true)
      markSaved()
      setTimeout(() => setTitleSaved(false), 2000)
    },
  })

  const addSlideMutation = useMutation({
    mutationFn: (slide: Omit<HeroSlide, '_id'>) => addHeroSlide(token, slide),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sfKey })
      setShowAddForm(false)
      markSaved()
    },
  })

  const updateSlideMutation = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: Partial<HeroSlide> }) =>
      updateHeroSlide(token, id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sfKey })
      setEditingSlide(null)
      markSaved()
    },
  })

  const deleteSlideMutation = useMutation({
    mutationFn: (id: string) => deleteHeroSlide(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sfKey })
      setConfirmDelete(null)
      markSaved()
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) => reorderHeroSlides(token, order),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sfKey }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      toggleProductFeatured(token, id, featured),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', token] })
      queryClient.invalidateQueries({ queryKey: sfKey })
    },
  })

  const reorderFeaturedMutation = useMutation({
    mutationFn: (order: string[]) => reorderFeaturedProducts(token, order),
    onMutate: (order: string[]) => {
      const previous = featuredIds
      setFeaturedIds(order)
      return { previous }
    },
    onError: (_err, _order, context) => {
      if (context?.previous) {
        setFeaturedIds(context.previous)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', token] })
      queryClient.invalidateQueries({ queryKey: sfKey })
    },
  })

  const createCollMutation = useMutation({
    mutationFn: (data: CollectionFormData) => createCollection(token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', token] })
      setShowAddCollForm(false)
      markSaved()
    },
  })

  const updateCollMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; coverImage?: string; isActive?: boolean } }) =>
      updateCollection(token, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', token] })
      setEditingColl(null)
      markSaved()
    },
  })

  const deleteCollMutation = useMutation({
    mutationFn: (id: string) => deleteCollection(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', token] })
      setConfirmDeleteColl(null)
      markSaved()
    },
  })

  const reorderCollMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderCollections(token, orderedIds.map((id, idx) => ({ id, sortOrder: idx }))),
    onMutate: (orderedIds: string[]) => {
      const previous = collectionIds
      setCollectionIds(orderedIds)
      return { previous }
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) setCollectionIds(context.previous)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', token] })
    },
  })

  const setCollectionProductsMutation = useMutation({
    mutationFn: ({ collectionId, productIds }: { collectionId: string; productIds: string[] }) =>
      setCollectionProducts(token, collectionId, productIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setSavedCollectionId(variables.collectionId)
      markSaved()
      setTimeout(() => setSavedCollectionId(current => current === variables.collectionId ? null : current), 2000)
    },
  })

  const visibilityMutation = useMutation({
    mutationFn: ({ id, shopVisible }: { id: string; shopVisible: boolean }) =>
      setProductShopVisibility(token, id, shopVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', token] })
    },
  })

  const reorderShopMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderProducts(token, orderedIds.map((id, idx) => ({ id, sortOrder: idx * 10 }))),
    onMutate: (orderedIds: string[]) => {
      const previous = shopVisibleIds
      setShopVisibleIds(orderedIds)
      return { previous }
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) setShopVisibleIds(context.previous)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', token] })
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function handleReorder(index: number, dir: 1 | -1) {
    const slides = [...(data?.config?.heroSlides ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )
    const target = index + dir
    if (target < 0 || target >= slides.length) return
    ;[slides[index], slides[target]] = [slides[target], slides[index]]
    reorderMutation.mutate(slides.map(s => s._id!))
  }

  function handleFeaturedDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = featuredIds.indexOf(String(active.id).replace('featured-', ''))
    const newIndex = featuredIds.indexOf(String(over.id).replace('featured-', ''))
    if (oldIndex === -1 || newIndex === -1) return
    const newOrder = arrayMove(featuredIds, oldIndex, newIndex)
    reorderFeaturedMutation.mutate(newOrder)
  }

  function handleCollectionDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = collectionIds.indexOf(String(active.id).replace('coll-', ''))
    const newIndex = collectionIds.indexOf(String(over.id).replace('coll-', ''))
    if (oldIndex === -1 || newIndex === -1) return
    reorderCollMutation.mutate(arrayMove(collectionIds, oldIndex, newIndex))
  }

  function handleShopDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = shopVisibleIds.indexOf(String(active.id).replace('shop-', ''))
    const newIndex = shopVisibleIds.indexOf(String(over.id).replace('shop-', ''))
    if (oldIndex === -1 || newIndex === -1) return
    reorderShopMutation.mutate(arrayMove(shopVisibleIds, oldIndex, newIndex))
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const sortedSlides = [...(data?.config?.heroSlides ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
  const allCollections = collectionsQuery.data?.items ?? []
  const sortedCollections = collectionIds
    .map(id => allCollections.find(c => c._id === id))
    .filter((c): c is Collection => c !== undefined)
  const products = (productsQuery.data?.items ?? []).filter(
    (product): product is Product => Boolean(product._id || product.id),
  )
  const featuredProducts = products.filter(p => p.featured)
  const nonFeaturedProducts = products.filter(p => !p.featured)
  const sortedFeaturedProducts = featuredIds
    .map(id => featuredProducts.find(p => p._id === id))
    .filter((p): p is Product => p !== undefined)
  const featuredCount = featuredProducts.length
  const shopVisibleProducts = products.filter(p => p.shopVisible)
  const shopHiddenProducts = products.filter(p => !p.shopVisible)
  const sortedShopVisibleProducts = shopVisibleIds
    .map(id => shopVisibleProducts.find(p => p._id === id))
    .filter((p): p is Product => p !== undefined)
  const annLen = annForm.text.length
  const annCountColor =
    annLen >= 120 ? '#e05252' : annLen >= 100 ? '#c9a96e' : '#444'

  function handleToggleCollectionProducts(collection: Collection) {
    if (expandedCollectionId === collection._id) {
      setExpandedCollectionId(null)
      setSelectedCollectionProductIds([])
      setSavedCollectionId(null)
      return
    }

    setExpandedCollectionId(collection._id)
    setSelectedCollectionProductIds(
      products
        .filter((product) => product.productCollection === collection.name)
        .map((product) => product._id),
    )
    setSavedCollectionId(null)
  }

  function handleToggleProductSelection(productId: string) {
    setSelectedCollectionProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }

  function handleCancelCollectionProducts() {
    setExpandedCollectionId(null)
    setSelectedCollectionProductIds([])
    setSavedCollectionId(null)
  }

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-[#555]">
        Loading storefront config…
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-3xl font-normal text-[#f0ede8]">Storefront</h1>
        {lastSaved && (
          <p className="text-xs text-[#444]">
            Last saved{' '}
            {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* ── Section 0: Shop — live products ────────────────────────────────── */}
      <Section
        title="Shop — live products"
        subtitle="Control which products appear in the /shop page"
      >
        {productsQuery.isLoading ? (
          <p className="py-8 text-center text-xs text-[#555]">Loading products…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Live in shop */}
              <div>
                <div className="mb-3">
                  <MiniStat label="products live" value={String(shopVisibleProducts.length)} />
                </div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[#444]">
                  Live in shop
                </p>
                {sortedShopVisibleProducts.length === 0 ? (
                  <EmptyState
                    title="No live products"
                    description="Toggle products on the right to publish them to the shop"
                  />
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleShopDragEnd}
                  >
                    <SortableContext
                      items={sortedShopVisibleProducts.map(p => `shop-${p._id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {sortedShopVisibleProducts.map(p => (
                          <SortableShopCard
                            key={`shop-${p._id}`}
                            product={p}
                            onToggle={() =>
                              visibilityMutation.mutate({ id: p._id, shopVisible: false })
                            }
                            isToggling={visibilityMutation.isPending}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Right: Hidden / not launched */}
              <div>
                <p className="mb-2 mt-8 text-[11px] uppercase tracking-[0.2em] text-[#444]">
                  Hidden / not launched
                </p>
                {shopHiddenProducts.length === 0 ? (
                  <p className="text-xs text-[#555]">All products are live</p>
                ) : (
                  <div className="space-y-2">
                    {shopHiddenProducts.map(p => {
                      const primaryImg = p.media.find(m => m.isPrimary)?.url ?? p.media[0]?.url
                      return (
                        <div
                          key={`shop-hidden-${p._id}`}
                          className="flex items-center gap-3 border border-[#1e1e1e] bg-[#0f0f0f] p-2"
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden bg-[#0a0a0a]">
                            {primaryImg && (
                              <img
                                src={toAssetUrl(primaryImg)}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-[#f0ede8]">{p.name}</p>
                            <p className="mt-0.5 text-[11px] text-[#555]">
                              {formatCurrency(p.sellingPrice)}
                            </p>
                          </div>
                          <Toggle
                            checked={false}
                            onChange={() =>
                              visibilityMutation.mutate({ id: p._id, shopVisible: true })
                            }
                            disabled={visibilityMutation.isPending}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Section>

      <hr className="my-8 border-[#1e1e1e]" />

      {/* ── Section 1: Announcement bar ────────────────────────────────────── */}
      <Section
        title="Announcement bar"
        subtitle="Shown at the top of every storefront page"
      >
        <div className="border border-[#1e1e1e] bg-[#0f0f0f] p-5">
          {/* Toggle row */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#f0ede8]">Show on storefront</span>
            <Toggle
              checked={annForm.isActive}
              onChange={v => setAnnForm(f => ({ ...f, isActive: v }))}
            />
          </div>

          {/* Status line */}
          <p
            className="mt-2 text-[11px]"
            style={{ color: annForm.isActive ? '#4caf50' : '#555' }}
          >
            {annForm.isActive
              ? '● Currently live on storefront'
              : '● Hidden from storefront'}
          </p>

          {/* Text + link (dimmed when inactive) */}
          <div
            className="mt-4 space-y-3"
            style={{
              opacity: annForm.isActive ? 1 : 0.4,
              pointerEvents: annForm.isActive ? 'auto' : 'none',
            }}
          >
            <div>
              <input
                type="text"
                value={annForm.text}
                onChange={e => setAnnForm(f => ({ ...f, text: e.target.value }))}
                maxLength={120}
                placeholder="e.g. Free shipping on orders above Rs. 2000"
                className="w-full border bg-[#0a0a0a] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
                style={{ borderColor: annLen >= 120 ? '#e05252' : '#1e1e1e' }}
              />
              <p
                className="mt-1 text-right text-[11px]"
                style={{ color: annCountColor }}
              >
                {annLen} / 120
              </p>
            </div>
            <div>
              <input
                type="text"
                value={annForm.link}
                onChange={e => setAnnForm(f => ({ ...f, link: e.target.value }))}
                placeholder="https://… (optional)"
                className="w-full border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
              />
              <p className="mt-1 text-xs text-[#444]">Leave empty for no link</p>
            </div>
          </div>

          {/* Save */}
          <div className="mt-5 flex justify-end">
            <Button
              size="sm"
              disabled={annMutation.isPending}
              onClick={() => annMutation.mutate(annForm)}
            >
              {annMutation.isPending
                ? 'Saving…'
                : annSaved
                  ? 'Saved ✓'
                  : 'Save announcement'}
            </Button>
          </div>
        </div>
      </Section>

      <hr className="my-8 border-[#1e1e1e]" />

      {/* ── Section 2: Hero slides ──────────────────────────────────────────── */}
      <Section
        title="Hero slides"
        subtitle="Full-width banner images shown on the homepage"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            + Add slide
          </Button>
        }
      >
        {showAddForm && (
          <div className="mb-4">
            <SlideForm
              token={token}
              initial={{ ...BLANK_SLIDE }}
              label="New slide"
              onSave={slide => addSlideMutation.mutate(slide)}
              onCancel={() => setShowAddForm(false)}
              isSaving={addSlideMutation.isPending}
            />
          </div>
        )}

        {sortedSlides.length === 0 ? (
          <EmptyState
            title="No hero slides yet"
            description="Add a slide to show a banner carousel on your homepage"
          />
        ) : (
          <div className="space-y-3">
            {sortedSlides.map((slide, index) => (
              <div key={slide._id}>
                {/* Slide card */}
                <div className="flex items-start gap-4 border border-[#1e1e1e] bg-[#0f0f0f] p-4">
                  {/* Thumbnail */}
                  <div className="h-20 w-32 shrink-0 overflow-hidden bg-[#0a0a0a]">
                    {slide.image ? (
                      <img
                        src={toAssetUrl(slide.image)}
                        alt={slide.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-[10px] text-[#444]">No image</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#f0ede8]">
                      {slide.title || '(untitled)'}
                    </p>
                    {slide.subtitle && (
                      <p className="mt-0.5 text-xs text-[#555]">{slide.subtitle}</p>
                    )}
                    <p className="mt-1 text-xs text-[#444]">
                      {slide.ctaText} → {slide.ctaLink}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: slide.isActive ? '#4caf50' : '#444' }}
                      />
                      <span className="text-[11px] text-[#555]">
                        {slide.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <Toggle
                        checked={slide.isActive}
                        onChange={() =>
                          updateSlideMutation.mutate({
                            id: slide._id!,
                            data: { isActive: !slide.isActive },
                          })
                        }
                      />
                      <span className="text-xs text-[#555]">Active</span>
                    </label>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingSlide(editingSlide === slide._id ? null : slide._id!)
                        }
                        className="px-2 py-1 text-xs text-[#555] transition-colors hover:text-[#f0ede8]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => handleReorder(index, -1)}
                        className="px-1.5 py-1 text-xs text-[#555] transition-colors hover:text-[#f0ede8] disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={
                          index === sortedSlides.length - 1 || reorderMutation.isPending
                        }
                        onClick={() => handleReorder(index, 1)}
                        className="px-1.5 py-1 text-xs text-[#555] transition-colors hover:text-[#f0ede8] disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete(
                            confirmDelete === slide._id ? null : slide._id!,
                          )
                        }
                        className="px-2 py-1 text-xs text-[#e05252] transition-colors hover:text-[#ff7070]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline delete confirm */}
                {confirmDelete === slide._id && (
                  <div className="border border-t-0 border-[#1e1e1e] bg-[#0a0a0a] p-4">
                    <p className="text-sm text-[#f0ede8]">
                      Delete this slide? This cannot be undone.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#e05252] text-[#e05252] hover:bg-[#e05252]/10"
                        disabled={deleteSlideMutation.isPending}
                        onClick={() => deleteSlideMutation.mutate(slide._id!)}
                      >
                        {deleteSlideMutation.isPending ? 'Deleting…' : 'Confirm delete'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Inline edit form */}
                {editingSlide === slide._id && (
                  <div className="mt-2">
                    <SlideForm
                      token={token}
                      initial={{
                        image: slide.image,
                        videoUrl: slide.videoUrl ?? '',
                        title: slide.title,
                        subtitle: slide.subtitle,
                        ctaText: slide.ctaText,
                        ctaLink: slide.ctaLink,
                        isActive: slide.isActive,
                        sortOrder: slide.sortOrder,
                      }}
                      label="Edit slide"
                      onSave={updated =>
                        updateSlideMutation.mutate({ id: slide._id!, data: updated })
                      }
                      onCancel={() => setEditingSlide(null)}
                      isSaving={updateSlideMutation.isPending}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <hr className="my-8 border-[#1e1e1e]" />

      {/* ── Section 3: Featured products ────────────────────────────────────── */}
      <Section
        title="Featured products"
        subtitle="Products marked as featured appear on the storefront homepage"
      >
        {/* Section title editor */}
        <div className="mb-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[#444]">
            Homepage section heading
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={featuredTitle}
              onChange={e => setFeaturedTitle(e.target.value)}
              placeholder="e.g. New Arrivals"
              className="flex-1 border border-[#1e1e1e] bg-[#0f0f0f] px-3 py-2 text-sm text-[#f0ede8] placeholder-[#444] outline-none focus:border-[#333]"
            />
            <Button
              size="sm"
              disabled={titleMutation.isPending}
              onClick={() => titleMutation.mutate(featuredTitle)}
            >
              {titleMutation.isPending
                ? 'Saving…'
                : titleSaved
                  ? 'Saved ✓'
                  : 'Save'}
            </Button>
          </div>
        </div>

        {/* Featured count */}
        <div className="mb-5">
          <MiniStat label="Featured products" value={String(featuredCount)} />
        </div>

        {/* Product grid */}
        {productsQuery.isLoading ? (
          <p className="py-8 text-center text-xs text-[#555]">Loading products…</p>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products"
            description="Add products in the Catalog view"
          />
        ) : (
          <>
            {/* Featured products — drag-to-reorder list */}
            {sortedFeaturedProducts.length > 0 && (
              <div className="mb-6">
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[#444]">
                  Featured — drag to reorder
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleFeaturedDragEnd}
                >
                  <SortableContext items={sortedFeaturedProducts.map(p => `featured-${p._id}`)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {sortedFeaturedProducts.map(p => (
                        <SortableFeaturedCard
                          key={`featured-${p._id}`}
                          product={p}
                          onToggle={() =>
                            toggleMutation.mutate({ id: p._id, featured: false })
                          }
                          isToggling={toggleMutation.isPending}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Non-featured products — static toggle grid */}
            {nonFeaturedProducts.length > 0 && (
              <div>
                {sortedFeaturedProducts.length > 0 && (
                  <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-[#444]">
                    All products
                  </p>
                )}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 12,
                  }}
                >
                  {nonFeaturedProducts.map(p => {
                    const primaryImg =
                      p.media.find(m => m.isPrimary)?.url ?? p.media[0]?.url
                    return (
                      <div key={`catalog-${p._id}`} className="border border-[#1e1e1e] bg-[#0f0f0f]">
                        <div className="relative aspect-square overflow-hidden bg-[#0a0a0a]">
                          {primaryImg && (
                            <img
                              src={toAssetUrl(primaryImg)}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="p-2">
                          <p className="truncate text-xs font-medium text-[#f0ede8]">
                            {p.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#555]">
                            {formatCurrency(p.sellingPrice)}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              toggleMutation.mutate({ id: p._id, featured: true })
                            }
                            disabled={toggleMutation.isPending}
                            className="mt-2 w-full py-1 text-[11px] transition-colors disabled:opacity-50 bg-[#1e1e1e] text-[#555] hover:text-[#f0ede8]"
                          >
                            ☆ Add to featured
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </Section>

      <hr className="my-8 border-[#1e1e1e]" />

      {/* ── Section 4: Collections ──────────────────────────────────────────── */}
      <Section
        title="Collections"
        subtitle="Curated groups of products shown on the storefront"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCollForm(true)}
            disabled={showAddCollForm}
          >
            + Add collection
          </Button>
        }
      >
        {showAddCollForm && (
          <div className="mb-4">
            <CollectionForm
              token={token}
              initial={{ name: '', description: '', coverImage: '' }}
              label="New collection"
              onSave={data => createCollMutation.mutate(data)}
              onCancel={() => setShowAddCollForm(false)}
              isSaving={createCollMutation.isPending}
            />
          </div>
        )}

        {collectionsQuery.isLoading ? (
          <p className="py-8 text-center text-xs text-[#555]">Loading collections…</p>
        ) : allCollections.length === 0 ? (
          <EmptyState
            title="No collections yet"
            description="Create a collection to group products on the storefront"
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCollectionDragEnd}
          >
            <SortableContext
              items={sortedCollections.map(c => `coll-${c._id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sortedCollections.map(collection => (
                  <div key={collection._id}>
                    <SortableCollectionRow
                      collection={collection}
                      onToggle={() =>
                        updateCollMutation.mutate({
                          id: collection._id,
                          data: { isActive: !collection.isActive },
                        })
                      }
                      onEdit={() =>
                        setEditingColl(editingColl === collection._id ? null : collection._id)
                      }
                      onDelete={() =>
                        setConfirmDeleteColl(
                          confirmDeleteColl === collection._id ? null : collection._id,
                        )
                      }
                      onManageProducts={() => handleToggleCollectionProducts(collection)}
                      isExpanded={expandedCollectionId === collection._id}
                      isUpdating={updateCollMutation.isPending}
                    />

                    {expandedCollectionId === collection._id && (
                      <div className="border border-t-0 border-[#1e1e1e] bg-[#0a0a0a] p-4">
                        {productsQuery.isLoading ? (
                          <p className="py-8 text-center text-xs text-[#555]">Loading products…</p>
                        ) : products.length === 0 ? (
                          <p className="py-8 text-center text-xs text-[#555]">No products available</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                              {products.map((product) => {
                                const primaryImg =
                                  product.media.find((m) => m.isPrimary)?.url ?? product.media[0]?.url
                                const isSelected = selectedCollectionProductIds.includes(product._id)

                                return (
                                  <button
                                    key={`collection-product-${collection._id}-${product._id}`}
                                    type="button"
                                    onClick={() => handleToggleProductSelection(product._id)}
                                    className="relative overflow-hidden border bg-[#0f0f0f] text-left transition-colors"
                                    style={{
                                      borderColor: isSelected ? '#1D9E75' : '#1e1e1e',
                                      borderWidth: isSelected ? '2px' : '1px',
                                    }}
                                  >
                                    {isSelected && (
                                      <span className="absolute right-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1D9E75] text-[#080808]">
                                        <Check className="h-3 w-3" />
                                      </span>
                                    )}
                                    <div className="aspect-square overflow-hidden bg-[#111]">
                                      {primaryImg ? (
                                        <img
                                          src={toAssetUrl(primaryImg)}
                                          alt={product.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                          <ImageOff className="h-4 w-4 text-[#333]" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-2">
                                      <p className="truncate text-[12px] text-[#f0ede8]">{product.name}</p>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                              <Button
                                size="sm"
                                disabled={setCollectionProductsMutation.isPending}
                                onClick={() =>
                                  setCollectionProductsMutation.mutate({
                                    collectionId: collection._id,
                                    productIds: selectedCollectionProductIds,
                                  })
                                }
                              >
                                {setCollectionProductsMutation.isPending &&
                                expandedCollectionId === collection._id
                                  ? 'Saving…'
                                  : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelCollectionProducts}
                              >
                                Cancel
                              </Button>
                              {savedCollectionId === collection._id && (
                                <span className="text-xs text-[#1D9E75]">Saved</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Inline delete confirm */}
                    {confirmDeleteColl === collection._id && (
                      <div className="border border-t-0 border-[#1e1e1e] bg-[#0a0a0a] p-4">
                        <p className="text-sm text-[#f0ede8]">
                          Delete &ldquo;{collection.name}&rdquo;? This cannot be undone.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#e05252] text-[#e05252] hover:bg-[#e05252]/10"
                            disabled={deleteCollMutation.isPending}
                            onClick={() => deleteCollMutation.mutate(collection._id)}
                          >
                            {deleteCollMutation.isPending ? 'Deleting…' : 'Confirm delete'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteColl(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Inline edit form */}
                    {editingColl === collection._id && (
                      <div className="mt-2">
                        <CollectionForm
                          token={token}
                          initial={{
                            name: collection.name,
                            description: collection.description,
                            coverImage: collection.coverImage,
                          }}
                          label="Edit collection"
                          onSave={data =>
                            updateCollMutation.mutate({ id: collection._id, data })
                          }
                          onCancel={() => setEditingColl(null)}
                          isSaving={updateCollMutation.isPending}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Section>
    </div>
  )
}
