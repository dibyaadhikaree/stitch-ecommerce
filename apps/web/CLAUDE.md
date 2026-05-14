# CLAUDE.md — apps/web

## What this app is

Next.js 16 + React 19 + TypeScript admin dashboard for STITCH Studio. Runs on **port 3000**. Internal tool — not customer-facing. Manages products, inventory, orders, customers, collections, storefront CMS, and business analytics.

> **Next.js note**: This version has breaking changes from older Next.js. Read `node_modules/next/dist/docs/` before writing any Next.js code. Heed all deprecation notices.

---

## Commands

Run from `apps/web/`:

```bash
npm run dev     # dev server on http://localhost:3000
npm run build   # production build
npm run lint    # ESLint
```

Environment: Set `NEXT_PUBLIC_API_URL=http://localhost:4000/api` in `apps/web/.env.local`.

---

## Auth

- **Store**: `lib/auth-store.ts` — Zustand store persisted to `localStorage` key `rych-admin-auth`.
- **State**: `token`, `admin`, `hydrated`. SSR hydration guard prevents mismatches. Serializes only `token` + `admin`.
- **Guard**: `admin-shell.tsx` redirects to `/` if hydrated with no token.
- **No user DB** — credentials validated against `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars on the API; valid credentials return a 7-day JWT.

---

## Routing

App Router with a `(admin)` route group. Root page is the login gate; all authenticated pages live under `(admin)/`.

```
app/
├── page.tsx                     ← Login gate: shows <LoginPage> or redirects to /dashboard
├── layout.tsx                   ← Root HTML layout (fonts, providers)
├── (admin)/
│   ├── layout.tsx               ← Wraps all admin pages in <AdminShell> + Suspense
│   ├── dashboard/page.tsx       ← <DashboardView />
│   ├── catalog/page.tsx         ← <CatalogView />
│   ├── orders/page.tsx          ← <OrdersView />
│   ├── customers/page.tsx       ← <CustomersView />
│   ├── inventory/page.tsx       ← <InventoryView />
│   ├── promotions/page.tsx      ← <PromoView />
│   ├── expenses/page.tsx        ← <ExpensesView />
│   ├── settings/page.tsx        ← <SettingsView />
│   └── storefront/page.tsx      ← <StorefrontView /> (Storefront CMS)
├── products/
│   ├── new/page.tsx             ← <ProductEditorPage /> (create mode)
│   └── [id]/page.tsx            ← <ProductEditorPage id={params.id} /> (edit mode)
└── orders/
    └── new/page.tsx             ← <OrderCreatePage />
```

> **Dead code**: `components/admin-app.tsx` is a legacy `?view=` query-param shell. No longer mounted anywhere. Do not use or extend it.

---

## Shell — `components/admin-shell.tsx`

Left sidebar (60w), top header, auth guard, keyboard shortcut (`N` → `/orders/new`). Warms TanStack Query cache for settings and dashboard data on mount. Polls pending order count every 60 seconds; if count > 0, shows a small pill badge on the Orders nav item (background var(--color-background-danger), text color var(--color-text-danger), 10px font, 500 weight, 18px height, 9px border-radius). Nav items: Dashboard, Catalog, **Storefront** (Globe icon, `/storefront`), Orders, Customers, Inventory, **Promotions** (Tag icon, `/promotions`), Expenses, Settings.

---

## Views (`components/views/`)

| File                      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login-page.tsx`          | Email/password form; calls `useAuthStore.setAuth()` on success                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `dashboard-view.tsx`      | Revenue/Profit/Expenses/Orders stat cards; 8-week bar chart (recharts); top-5 products by sales; recent 5 orders; low-stock alert banner                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `catalog-view.tsx`        | Products tab (grid with search, category, collection, stock filters; click → edit page) + Categories tab (add/list/delete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `orders-view.tsx`         | Four status lanes: Pending, Shipped, Delivered, Cancelled. Order modal with next actions; returns only from Delivered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `customers-view.tsx`      | Paginated customer list with phone search; detail modal with order history                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `inventory-view.tsx`      | Inventory tab: select product → per-variant stock, add variants, stock-in, correct-stock. History tab: filterable log                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `expenses-view.tsx`       | Add expense form + expense ledger with delete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `settings-view.tsx`       | Shop name, low-stock threshold, accepted payment methods, workflow info cards. **Storefront content section** — the single place to edit all customer-facing static content, split into four subsections: (1) **About page** — headline, body (6-row textarea, preserves line breaks), image URL (Cloudinary or direct URL helper); (2) **Social + contact** — Instagram/TikTok handles, WhatsApp number; (3) **Policies** — shipping note (3-row textarea, shown in checkout + PDP) and return policy (3-row textarea, shown in PDP Shipping & Returns accordion); (4) **SEO** — site title (maps to `seoTitle`, max 60 chars with live "X / 60" counter that goes red over limit) and meta description (maps to `seoDescription`, max 160 chars with same counter). One "Save storefront content" button at the bottom with 2s "Saved" state. **Size guide section**: per-category size guide editor (textarea, keyed by category slug) with shared Save button and 2s success state. |
| `product-editor-page.tsx` | Full product create/edit: name, category, collection, prices (margin auto-calculated), compare-at price (marketPrice) for sale display with helper text, multi-image upload (drag-and-drop, sequential, per-file status), image grid with tag selector and primary controls, "Save media order" button (edit mode), variant management, delete, `shopVisible` toggle, `sortOrder` field                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `order-create-page.tsx`   | Fast manual order entry. Phone lookup pre-fills customer data. Orders created as Pending                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `storefront-view.tsx`     | Single-page scrollable CMS. Five stacked sections: (1) Announcement bar — isActive toggle, text (120 char limit + live counter), optional link URL, save with 2s success state; (2) Hero slides — add/edit/delete/reorder (↑↓)/toggle-active; inline forms with Cloudinary image upload; inline delete confirm; (3) Featured products — all products grid, ★ toggle per card, no limit, live count MiniStat, section title editor; (4) Featured product order — drag-and-drop reorder; (5) Collections — EmptyState placeholder. Sidebar: Globe icon, view key `'storefront'`, between Catalog and Orders                                                                                                                                                                                                                                                                                                                                                                               |
| `promo-view.tsx`          | Promo codes manager. Create form (code, type, value, min order, max uses, expiry date). Codes table with Code/Type/Value/Min order/Uses/Expiry/Status/Actions columns. Enable/Disable toggle + inline Delete confirm per row.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

---

## API client — `lib/api.ts`

All API calls and TypeScript types live here. **Never add fetch calls inline in components.**

### Type exports

`AdminUser`, `Category`, `ProductVariant`, `ProductMedia`, `Product`, `Channel`, `Customer`, `DashboardPayload`, `InventoryLog`, `Order`, `Expense`, `Settings`, `OrderStatus`, `PaymentStatus`, `HeroSlide`, `StorefrontConfig`

### Functions by resource

| Group       | Functions                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth        | `login()`, `fetchMe()`                                                                                                                                                                                              |
| Dashboard   | `getDashboard()`                                                                                                                                                                                                    |
| Categories  | `getCategories()`, `createCategory()`, `deleteCategory()`                                                                                                                                                           |
| Products    | `getProducts()`, `getProductById()`, `getProductsWithFilters()`, `createProduct()`, `updateProduct()`, `appendProductVariants()`, `deleteProduct()`, `reorderProductMedia()`                                        |
| Collections | `getCollections()`, `createCollection()`, `updateCollection()`, `deleteCollection()`, `reorderCollections()`, `assignProductsToCollection()`                                                                        |
| Customers   | `getCustomers()`, `getCustomerById()`, `createCustomer()`, `updateCustomer()`                                                                                                                                       |
| Orders      | `getOrders()`, `getPendingOrderCount()`, `createOrder()`, `updateOrder()`, `updateOrderStatus()`, `updateOrderTracking()`, `createReturn()`, `deleteOrder()`                                                        |
| Inventory   | `getInventory()`, `createInventoryAdjustment()`, `correctInventoryStock()`, `createInventoryStockIn()`                                                                                                              |
| Expenses    | `getExpenses()`, `createExpense()`, `deleteExpense()`                                                                                                                                                               |
| Settings    | `getSettings()`, `updateSettings()`                                                                                                                                                                                 |
| Storefront  | `getStorefrontConfig()`, `updateAnnouncement()`, `updateFeaturedTitle()`, `addHeroSlide()`, `updateHeroSlide()`, `deleteHeroSlide()`, `reorderHeroSlides()`, `reorderFeaturedProducts()`, `toggleProductFeatured()` |
| Promo codes | `getPromoCodes()`, `createPromoCode()`, `togglePromoCode(id, isActive)`, `deletePromoCode(id)`                                                                                                                      |
| Uploads     | `uploadImage()` (multipart/form-data → Cloudinary)                                                                                                                                                                  |

---

## Shared UI

### `components/ui/`

Radix UI primitives wrapped with Tailwind + CVA. Use existing components before creating new ones.

| File               | Variants / notes                                                           |
| ------------------ | -------------------------------------------------------------------------- |
| `button.tsx`       | Variants: default, outline, secondary, ghost; sizes: default, sm, lg, icon |
| `card.tsx`         | —                                                                          |
| `badge.tsx`        | —                                                                          |
| `input.tsx`        | —                                                                          |
| `textarea.tsx`     | —                                                                          |
| `select.tsx`       | Native HTML `<select>`                                                     |
| `alert-dialog.tsx` | Radix primitive                                                            |

### `components/admin/primitives.tsx`

Shared UI atoms: `FormField`, `SummaryPill`, `MiniStat`, `EmptyState`, `Segmented`.

### Other shared components

| File                                   | Description                                       |
| -------------------------------------- | ------------------------------------------------- |
| `components/tables/orders-table.tsx`   | Data table for order rows                         |
| `components/charts/sales-overview.tsx` | Recharts bar chart for revenue/profit (dashboard) |
| `components/error-boundary.tsx`        | React error boundary; wraps each view             |
| `components/theme-provider.tsx`        | `next-themes` wrapper                             |
| `components/theme-toggle.tsx`          | Sun/moon icon button                              |

---

## Providers & state — `components/providers.tsx`

Wraps app in `QueryClientProvider` (staleTime: 1 min, no refetch on window focus) and `ThemeProvider`.

---

## Utilities

| File                | Exports                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/utils.ts`      | `cn()` (clsx + tailwind-merge), `formatCurrency()` (Intl NPR, no decimals)                                                                                   |
| `lib/asset-url.ts`  | `toAssetUrl(path)` — converts relative `/uploads/...` paths to absolute URLs; leaves Cloudinary URLs unchanged. Always call before rendering any image path. |
| `lib/auth-store.ts` | Zustand auth store (see Auth section)                                                                                                                        |

---

## Key dependencies

| Package                               | Purpose                                   |
| ------------------------------------- | ----------------------------------------- |
| `@tanstack/react-query`               | All server state — queries + mutations    |
| `zustand`                             | Auth store                                |
| `next-themes`                         | Dark/light theme                          |
| `lucide-react`                        | Icons                                     |
| `recharts`                            | Dashboard charts                          |
| `@radix-ui/*`                         | Alert dialog, Slot                        |
| `class-variance-authority`            | Variant management in Button + Badge      |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag-and-drop (installed, partially used) |

---

## Key rules

1. **All API calls through `lib/api.ts`** — never inline fetch in components.
2. **TanStack Query for all server state** — same `queryKey` across the app = shared cache, no duplicate requests.
3. **Path alias**: `@/*` maps to `src/*`. Use it for all imports; never use relative `../../` paths.
4. **Always call `toAssetUrl()`** before rendering any image path from the API.
5. **Admin product data must always carry a stable ID**. `lib/api.ts` normalizes `Product.id`/`Product._id` so storefront CMS actions never build `undefined` keys or `/products/undefined/*` requests.
6. **Product fields**: `shopVisible` controls whether a product appears in the storefront; `featured` controls whether it appears in the featured section; `sortOrder` is used to order featured products on the homepage.

---

## What is NOT built yet

| Area                                                                                                 | Status                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront view — hero slides, announcement bar, featured products manager, featured product reorder | **Done** — `storefront-view.tsx`                                                                                                                |
| Collections manager                                                                                  | **Partial** — placeholder section in storefront-view; full CRUD in catalog not yet added                                                        |
| Product sort-order controls                                                                          | **Done** — `sortOrder` field in product editor                                                                                                  |
| Image drag-to-reorder UI                                                                             | Not started — field data structure ready; reorder API endpoint ready (`PATCH /products/:id/media/reorder`); @dnd-kit installed but UI not built |
