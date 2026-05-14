# CLAUDE.md — apps/web-store

## What this app is

`apps/web-store` is the customer-facing storefront for STITCH Studio — a premium minimal fashion brand. It is a standalone Next.js 15 app (separate from the admin panel at `apps/web`). Customers browse products, add to cart, and check out here. It is designed as a dark-mode-only editorial site with heavy use of Framer Motion animation.

The app runs on **port 3001** and consumes the public `/api/store/*` endpoints from `apps/api`. All API integration is wired and functional.

---

## Commands

Run from `apps/web-store/`:

```bash
npm run dev      # starts on http://localhost:3001
npm run build    # production build
npm start        # production server on port 3001
npm run lint     # ESLint
```

Set `NEXT_PUBLIC_API_URL=http://localhost:4000/api` in `apps/web-store/.env.local`.

---

## Routing

```
app/
├── page.tsx                           ← Home: intro → hero → featured products → collections strip
├── not-found.tsx                      ← 404 page (Next.js built-in convention — no route needed)
├── metadata.ts                        ← Legacy metadata object (superseded by layout.tsx export)
├── layout.tsx                         ← Server Component root layout; exports base metadata; renders ClientLayout
├── shop/
│   ├── layout.tsx                     ← Shop segment metadata (title: 'Shop')
│   ├── page.tsx                       ← Shop listing with category filter & sort
│   └── [slug]/
│       └── page.tsx                   ← Product detail page (PDP); generateMetadata fetches product
├── about/
│   ├── layout.tsx                     ← About segment metadata wrapper (Client Component page can't export metadata)
│   └── page.tsx                       ← About page with CMS-editable content
├── collections/
│   ├── layout.tsx                     ← Collections segment metadata (title: 'Collections')
│   ├── page.tsx                       ← Collections listing grid
│   └── [slug]/
│       ├── page.tsx                   ← Collection product listing; generateMetadata derives title from slug
│       └── CollectionProductSection.tsx ← Collection product grid
└── checkout/
    ├── layout.tsx                     ← Checkout segment metadata wrapper (Client Component page can't export metadata)
    ├── page.tsx                       ← Checkout form (order summary, delivery details, place order)
    └── confirmation/
        └── page.tsx                   ← Order confirmation (displays order number from sessionStorage)
```

---

## Design tokens

All tokens are defined as CSS custom properties in [src/styles/globals.css](src/styles/globals.css) and mirrored as Tailwind color/font keys in [tailwind.config.ts](tailwind.config.ts).

### Colour palette (dark-only)

| Variable           | Hex       | Purpose                                                                    |
| ------------------ | --------- | -------------------------------------------------------------------------- |
| `--rych-bg`        | `#111111` | Page/body background (html + body default)                                 |
| `--rych-surface`   | `#1C1C1C` | Cards, panels, navbar background                                           |
| `--rych-lift`      | `#242424` | Elevated surface within panels (e.g. cart item thumbnails, category tiles) |
| `--rych-border`    | `#2A2A2A` | Subtle dividers (0.5px borders)                                            |
| `--rych-border2`   | `#333333` | Slightly stronger borders (size buttons, scrollbar thumb)                  |
| `--rych-parchment` | `#F0EDE6` | Primary text; warm off-white                                               |
| `--rych-ash`       | `#9E9B95` | Secondary/muted text, icon default colour                                  |
| `--rych-smoke`     | `#5A5855` | Tertiary/very muted text, strikethrough prices                             |
| `--rych-linen`     | `#E8E4DC` | Inverted CTA button background (light on dark)                             |

Use the Tailwind utility classes (`bg-surface`, `text-parchment`, `text-ash`, `border-rych`, etc.) defined in `@layer utilities` whenever possible. Fall back to inline `style={{ color: 'var(--rych-ash)' }}` for one-off values.

### Animation tokens

| Variable                 | Value                              | Purpose                              |
| ------------------------ | ---------------------------------- | ------------------------------------ |
| `--rych-ease`            | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Standard easing — all UI transitions |
| `--rych-ease-out`        | `cubic-bezier(0.0, 0.0, 0.2, 1)`   | Ease-out for elements entering       |
| `--rych-duration-fast`   | `200ms`                            | Hover colour transitions             |
| `--rych-duration-base`   | `400ms`                            | Standard element transitions         |
| `--rych-duration-slow`   | `600ms`                            | Page-level reveals                   |
| `--rych-duration-slower` | `800ms`                            | Cinematic/full-screen transitions    |

### Custom Tailwind extensions

- `font-display` → `Serenata, Georgia, serif`
- `font-sans` → `Inter, system-ui, sans-serif`
- `text-hero` → `clamp(48px, 8vw, 96px)`, lh 1.05, ls -0.02em
- `text-hero-sm` → `clamp(32px, 5vw, 56px)`, lh 1.1, ls -0.015em
- `text-label` → `11px`, ls 0.12em (use `.label` utility class instead)
- `tracking-widest-2` → `0.16em`; `tracking-widest-3` → `0.20em`
- `ease-rych` → `cubic-bezier(0.25, 0.1, 0.25, 1)`
- Durations: `duration-400`, `duration-600`, `duration-800`

---

## Font setup

### Serenata (display)

Custom font loaded via `@font-face` in `globals.css`. Files must be present at `public/fonts/Serenata.woff2` and `public/fonts/Serenata.woff`. Weights 300–400. Used for the brand wordmark, editorial headlines, and collection tile names.

Apply via: `font-family: var(--rych-font-display)` or Tailwind class `font-display`.

### Inter (UI)

Loaded at the layout level via `next/font/google` with CSS variable `--font-inter` and `display: swap`. Applied on `<html>` via `className={inter.variable}`. The base `html` rule in `globals.css` sets `font-family: var(--rych-font-sans)`.

Apply via: `font-family: var(--rych-font-sans)` or Tailwind class `font-sans`.

---

## Animation rules

All animation uses **Framer Motion**. Four constraints apply everywhere:

1. **Standard easing is always `[0.25, 0.1, 0.25, 1]`** (matches `--rych-ease`). Use this cubic-bezier for every motion transition unless there is a specific reason for a different curve. The only exception is the intro wipe which uses `[0.76, 0, 0.24, 1]`.

2. **Always respect `prefers-reduced-motion`**. Every animated component imports `useReducedMotion` from `@/hooks/useReducedMotion` and sets durations to `0` (or skips animation entirely) when `reduced === true`. Use the `dur = (base: number) => (reduced ? 0 : base)` pattern.

3. **Page transitions use `AnimatePresence` + `motion.main` in the root layout** keyed by `usePathname()`. The transition is a simple opacity fade (`duration: 0.3`). Do not add competing page-level transitions inside page components.

4. **One-time sequences use `sessionStorage` as the seen flag** — not state, not cookies. `IntroScreen` gates on `rych-intro-done`; the announcement bar gates on `rych-bar-dismissed`. Follow this pattern for any other one-time UI.

---

## Component map

### `src/components/layout/`

| File                                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Navbar.tsx](src/components/layout/Navbar.tsx)               | Fixed top nav (60px); hides on scroll down, reveals on scroll up; announcement bar driven by `useQuery(['homepage'], getHomepage, staleTime: 60s)` — rendered only when `announcementBar.isActive === true` and text is non-empty, dismissable via sessionStorage `rych-bar-dismissed`; SHOP hover dropdown fetches live categories via `useQuery(['categories'], getCategories, staleTime: 120s)` — tiles link to `/shop?category=${slug}`, falls back to single "All products" tile when empty; search icon (not yet wired), cart icon with item-count badge |
| [CartDrawer.tsx](src/components/layout/CartDrawer.tsx)       | Right-side slide-in drawer (max 400px); renders cart items with quantity +/− controls, line prices, total, and checkout link; empty state includes "SHOP NOW →" prompt                                                                                                                                                                                                                                                                                                                                                                                         |
| [Footer.tsx](src/components/layout/Footer.tsx)               | Client Component. Three-column footer (Shop / STITCH / Follow) with payment method strip. Follow column uses `useQuery(['store-settings'], getSettings, staleTime: 300s)` for dynamic social links (Instagram, TikTok, WhatsApp from settings); hidden if all handles empty. `footerTagline` renders centered below grid when set.                                                                                                                                                                                                                             |
| [SearchOverlay.tsx](src/components/layout/SearchOverlay.tsx) | Search overlay component (mounted, not yet fully integrated)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### `src/components/`

| File                                          | Description                                                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [Providers.tsx](src/components/Providers.tsx) | Wraps the app in `QueryClientProvider` (staleTime: 60s, refetchOnWindowFocus: false). Mounted in `app/layout.tsx` around all children. |

### `src/components/home/`

| File                                                                     | Description                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IntroScreen.tsx](src/components/home/IntroScreen.tsx)                   | Full-screen branded splash shown once per browser session; phases: fade-in → scale-grow → scale-up + wipe exit; skipped entirely when `rych-intro-done` is set or `prefers-reduced-motion` is active                                                                                                       |
| [HeroSection.tsx](src/components/home/HeroSection.tsx)                   | Full-viewport hero (100vh); plays `/images/landingvid.mp4` then falls back to `/images/hero-placeholder.jpg`; parallax at 0.4× scroll speed; headline uses clip-path sweep-up reveal keyed on `introComplete` prop; captures wheel/touch to scroll-snap to next section; accepts `heroSlide` prop from API |
| [ProductScrollSection.tsx](src/components/home/ProductScrollSection.tsx) | Scroll-snapped 100vh showcase cycling through featured products; alternates image-left / info-right layout per slide; auto-advances every 1800ms while in view (stops if user scrolls back); add-to-cart fires `useCartStore.addItem` with first available variant                                         |
| [CollectionsStrip.tsx](src/components/home/CollectionsStrip.tsx)         | 60vh equal-width tile strip; each tile fades+rises in on intersection; hover scales background image to 1.06× and lifts text label by 4px; loads collections via `getCollections()` from API                                                                                                               |

### `src/components/shop/`

| File                                                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ProductCard.tsx](src/components/shop/ProductCard.tsx) | Option D card. Clean info below image only. Image area: pure, no overlays, no text. 4:5 portrait aspect. Info below: name (left, 12px weight-300) + price (right) on row 1. Category label (9px smoke uppercase) on row 2. Hover: 3D tilt (max 5deg, scale 1.025) on mouse move. After 0.8s hover: secondary image fades in (crossfade 0.5s). Secondary image: prefers `tag === 'back'` media item; falls back to second sorted item. On mouse leave: timer cancelled, secondary fades out, tilt resets (0.55s ease). Touch: tilt disabled. Reduced motion: all transitions = none. Scroll reveal: opacity + translateY(20px→0) staggered by (index % 3) \* 80ms. Grid: 4-col desktop, 3-col tablet, 2-col mobile. **Sale pricing**: when `marketPrice > sellingPrice && marketPrice > 0`, display sellingPrice in `var(--rych-parchment)` and strikethrough marketPrice at 10px in `var(--rych-smoke)` beside it. **Sold out badge**: renders top-left (8px from edges) when all variants have `stock === 0`. Text "SOLD OUT" in 9px font-sans with 0.12em letter-spacing, background `var(--rych-bg)` at 0.85 opacity, color `var(--rych-ash)`, padding 3px 7px. Props: `{ product: StoreProduct, index?: number, className?: string }` |
| [CategoryBar.tsx](src/components/shop/CategoryBar.tsx) | Sticky pill bar (top: 60px) with horizontal overflow scroll. "ALL" pill always first. Active state uses Framer Motion `layoutId="active-pill"` sliding background. Item count right-aligned. **Sort selector**: rendered at the right end of the bar (outside scrollable area), as native `<select>` with options "New arrivals", "Price: low to high", "Price: high to low" (values: newest, price_asc, price_desc). Styled transparent background, no border, 11px font-sans, 0.08em letter-spacing, with ChevronDown icon (14px, ash) overlaid. Props: `categories`, `active`, `onChange`, `total`, `sort`, `onSortChange`. **Toggle behaviour**: clicking a non-ALL pill that is already active calls `onChange('all')` to deselect it; the "ALL" pill always calls `onChange('all')` regardless of current state.                                                                                                                                                                                                                                                                                                                                                                                                                    |

### `src/components/product/`

| File                                                          | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ImageSlider.tsx](src/components/product/ImageSlider.tsx)     | Center column image carousel. Direction-aware slide animation (AnimatePresence mode="wait"). Thumbnail strip at bottom. Keyboard arrow nav. Touch swipe support. Framer Motion variants with custom direction prop. Media is sorted by `sortOrder` ascending before display.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| [ProductInfo.tsx](src/components/product/ProductInfo.tsx)     | Left column. Product name, category, feature bullet list. Staggered entrance: breadcrumb fade, name clip-path sweep, divider scaleX, bullets x-slide stagger.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [PurchasePanel.tsx](src/components/product/PurchasePanel.tsx) | Right column. Price, size selector with OOS diagonal, stock note, 3-state add-to-cart with AnimatePresence text swap, delivery meta. All elements stagger in on mount. **Sale pricing**: when `marketPrice > sellingPrice && marketPrice > 0`, display sellingPrice at 28px in `var(--rych-parchment)` with inline "SALE" badge (9px, 0.12em letter-spacing, background `var(--rych-lift)`, color `var(--rych-ash)`, padding 2px 7px), and strikethrough marketPrice at 13px in `var(--rych-smoke)` below. **Stock note line**: rendered below size selector; fetches store settings via `useQuery(['store-settings'], getSettings)` to get `lowStockThreshold`. When size selected: shows "This size is sold out" if `stock === 0` (color `var(--rych-smoke)`), shows "Only X left" if `stock <= threshold` (color `var(--rych-ash)`), or nothing if `stock > threshold`. Styled 11px font-sans, 0.04em letter-spacing. Fades in/out with opacity 0→1, duration 0.3s, easing [0.25, 0.1, 0.25, 1], AnimatePresence mode="wait", respects `useReducedMotion`. |
| [RelatedScroll.tsx](src/components/product/RelatedScroll.tsx) | Infinite horizontal product loop. Duplicated array for seamless repeat. useAnimationControls for pause/resume. Pauses on hover and touch. Fade mask edges via CSS mask-image.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [Accordion.tsx](src/components/product/Accordion.tsx)         | Reusable. height 0→auto AnimatePresence. Icon rotates 45deg on open. Used for Care, Shipping, Size guide.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

## Pages

### `src/app/not-found.tsx`

Custom 404 page. Uses Next.js built-in `not-found` convention — rendered automatically for any unmatched route; no explicit route needed. Full-viewport, centered layout on `var(--rych-bg)`. Large "404" numeral in Serenata weight-300 (`clamp(80px, 15vw, 140px)`, `var(--rych-border2)`). Subtitle "This page doesn't exist." in 13px font-sans ash. Two links side by side (gap 32px): "BACK TO SHOP" → `/shop` and "HOME" → `/`. Links styled 10px uppercase, `0.14em` letter-spacing, ash; hover transitions to parchment in 200ms. Framer Motion: numeral fades in + scales 0.96→1 over 0.6s; text/links fade in with 0.15s delay over 0.4s. Easing `[0.25, 0.1, 0.25, 1]`. Respects `useReducedMotion`.

### `src/app/page.tsx` (Home)

Fetches homepage data via `getHomepage()`. Displays:

1. IntroScreen (one-time, gated by sessionStorage)
2. HeroSection (with first hero slide from API)
3. ProductScrollSection (with featured products from API)
4. CollectionsStrip (with collections from API)

### `src/app/shop/page.tsx`

Product listing page. Features:

- Category filter (ALL + API categories via `useQuery(['categories'], getCategories)` — shares React Query cache with Navbar, no duplicate fetch)
- Sort controls (newest, price_asc, price_desc) — managed via `[sort, setSort]` state alongside category state; both passed to `getProducts()` params and included in queryKey for cache invalidation on change
- `activeCategory === 'all'` is always converted to `undefined` before being passed to `getProducts()` — never passed as the literal string `'all'` to the API. The queryKey mirrors this: `{ category: activeCategory === 'all' ? undefined : activeCategory, sort }`.
- Pagination via infinite scroll ("LOAD MORE" button)
- Search (query param wired, not yet exposed in UI)
- Grid layout with skeleton loaders and empty state
- Filters applied via `getProducts(params)` with `shopVisible: true` check on backend

### `src/app/about/page.tsx`

About page. Client component. Fully driven by `useQuery(['store-settings'], getSettings)` — no hardcoded content. Features:

- Three full-bleed sections:
  1. **Hero** (100vh): background from `settings.aboutImageUrl`; headline from `settings.aboutHeadline` with clip-path sweep-up reveal — omitted entirely if empty; static "ABOUT" label always shown
  2. **Body** (centered 600px max-width, 80px padding): `settings.aboutBody` with white-space: pre-line; scroll-intersection fade-in
  3. **Follow strip** (full-width, border-top): conditional links from `instagramHandle`, `tiktokHandle`, `whatsappNumber`; hidden entirely if all are empty
- Respects `useReducedMotion` for all animations

### `src/app/shop/[slug]/page.tsx`

Product detail page (PDP). Server component. Features:

- 3-column layout (1fr 2fr 1fr) above-fold (65vh)
- Left: ProductInfo (breadcrumb, name, category, description)
- Center: ImageSlider (main product gallery)
- Right: PurchasePanel (price, size selector, add-to-cart, delivery info)
- Below fold: RelatedScroll (related products), 3 Accordions (Care, Shipping, Size Guide)
- Mobile: single-column layout
- Fetches store settings server-side to retrieve dynamic `sizeGuide` content keyed by product category slug. Passes `sizeGuideContent` to the Size Guide accordion, styled as `<pre>` with `white-space: pre-line` to preserve line breaks. Falls back to "Size guide coming soon." if no content is available. Accordion.tsx is unchanged — only the content prop is now dynamic.

### `src/app/collections/page.tsx`

Collections listing page. Features:

- Grid layout (1 col mobile, 2 col tablet, 3 col desktop)
- Each collection tile: cover image, name, description, "Explore →" link
- Loading skeleton tiles
- Empty state

### `src/app/collections/[slug]/page.tsx`

Collection product listing. Server component. Features:

- Fetches collection metadata and products filtered by collection slug
- Displays collection name as heading
- Shows grid of products in the collection (via CollectionProductSection)
- Empty state if no products
- Dynamic metadata via `generateMetadata()`

### `src/app/collections/[slug]/CollectionProductSection.tsx`

Renders a grid of products for a collection. Accepts `collection` and `products` props.

### `src/app/checkout/page.tsx`

Checkout form. Client component. Features:

- Order summary section (items, subtotal, optional discount row, total)
- Delivery details form (name, phone, address, city, optional note)
- Promo code UI between delivery details and place order button: text input + "APPLY" button. States: idle / checking (shows "...") / applied (disabled input, shows "CODE — NPR X off" badge with × to remove) / error (message below in `var(--rych-smoke)`). Applied discount row and code badge fade in with Framer Motion opacity 0→1 (0.3s, respects `useReducedMotion`).
- Two-stage validation: `validatePromoCode()` called on Apply for UX feedback (does not increment usedCount). `promoCode` field passed to `placeOrder()` on submit; server re-validates and increments usedCount.
- Place Order button (COD only)
- Form validation (all fields required)
- Error display
- Calls `placeOrder()` API function with optional `promoCode`
- Stores order number in sessionStorage
- Redirects to `/checkout/confirmation` on success
- Empty cart handling

### `src/app/checkout/confirmation/page.tsx`

Order confirmation page. Displays:

- Order number (retrieved from sessionStorage)
- Confirmation message
- Next steps

---

## State management

Single Zustand store, persisted to `localStorage` under key `rych-cart`.

**File**: [src/lib/cart-store.ts](src/lib/cart-store.ts)

**`CartItem` shape**:

```ts
{
  productId: string; // product _id from API
  variantId: string; // unique per variant (productId + size used as placeholder)
  name: string;
  sku: string;
  size: string;
  price: number; // sellingPrice at time of add
  image: string; // primary media URL
  quantity: number;
}
```

**Store actions**:

- `openCart()` / `closeCart()` — controls `isOpen` flag consumed by `CartDrawer`
- `addItem(item)` — increments quantity if `variantId` already in cart; otherwise appends with `quantity: 1`; always opens drawer
- `removeItem(variantId)` — removes the matching item
- `updateQty(variantId, qty)` — updates quantity; if `qty < 1` delegates to `removeItem`
- `clearCart()` — empties `items`
- `totalItems()` — sum of all quantities (used for navbar badge)
- `totalPrice()` — sum of `price × quantity` for all items

---

## API integration

**Fully wired.** The API client lives in `src/lib/api.ts`. Base URL is `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'`. No auth required for any store route.

### `src/lib/api.ts` — exported functions and types

**Types**:

- `StoreProduct` — product with variants, media (sorted by sortOrder), category ref
- `StoreCategory` — category with name, slug, and `productCount` (active + shopVisible products in that category)
- `StoreCollection` — collection with name, slug, description, coverImage, sortOrder
- `HeroSlide` — hero slide with imageUrl, videoUrl, headline, subtext, ctaText, ctaLink, isActive
- `HomepageData` — homepage response shape (heroSlides, announcementBar, featuredProducts, featuredSectionTitle, collections)
- `CheckoutPayload` — order submission shape (customerName, phone, address, city, items)

**Functions**:

| Export                                | Endpoint                    | Used by                                                                                                                                 |
| ------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `getProducts(params?)`                | `GET /store/products`       | shop page, collection product section                                                                                                   |
| `getCategories()`                     | `GET /store/categories`     | shop page, navbar — returns `StoreCategory[]` (plain array, server-filtered to categories with at least one active+shopVisible product) |
| `getProductBySlug(slug)`              | `GET /store/products/:slug` | PDP                                                                                                                                     |
| `getCollections()`                    | `GET /store/collections`    | collections page, collections strip                                                                                                     |
| `getHomepage()`                       | `GET /store/homepage`       | home page                                                                                                                               |
| `getSettings()`                       | `GET /store/settings`       | PurchasePanel (low stock threshold)                                                                                                     |
| `validatePromoCode(code, orderTotal)` | `POST /promo/validate`      | checkout page — client-side validation for UX (does not increment usedCount)                                                            |
| `placeOrder(payload)`                 | `POST /store/orders`        | checkout page                                                                                                                           |

All calls use TanStack Query. Do not add inline fetch calls in components.

---

## Utility functions

**File**: [src/lib/utils.ts](src/lib/utils.ts)

- `cn(...inputs)` — `clsx` + `tailwind-merge` for conditional class names
- `formatNPR(amount)` — formats a number as `NPR 4,500` (no decimals, en-US locale)

**File**: [src/hooks/useReducedMotion.ts](src/hooks/useReducedMotion.ts)

- `useReducedMotion()` — returns `true` if `prefers-reduced-motion: reduce` is active; updates reactively on media query change

---

## SEO / Metadata

### Architecture

The root layout (`src/app/layout.tsx`) is a **Server Component** that exports the base `Metadata` object used as a fallback for all pages. The interactive parts of the layout (Navbar, CartDrawer, AnimatePresence page transition, Footer) live in `src/components/layout/ClientLayout.tsx` (`'use client'`), which the root layout renders as a child.

**Base metadata** (root `layout.tsx`):

```ts
export const metadata: Metadata = {
  title: { default: "STITCH", template: "%s — STITCH" },
  description: "Premium minimal fashion.",
  openGraph: { siteName: "STITCH", type: "website", locale: "en_US" },
};
```

The `template: '%s — STITCH'` applies automatically to any page or layout that returns a plain string `title`, e.g. `title: 'Shop'` → `Shop — STITCH`.

### Dynamic routes — `generateMetadata`

- **`src/app/shop/[slug]/page.tsx`** — fetches the product via `getProductBySlug(slug)`, returns `title: product.name` (template gives `{name} — STITCH`), description, and OG image from the primary media item.
- **`src/app/collections/[slug]/page.tsx`** — fetches products via `getProducts({ collection: slug })`, derives the title by capitalising and de-hyphenating the slug string, and includes the product count in the description.

### Client Component pages — layout wrapper pattern

`'use client'` pages cannot export `metadata`. Static metadata for those routes lives in a co-located Server Component `layout.tsx`:

| Route          | Layout file                      | Notes                                                                  |
| -------------- | -------------------------------- | ---------------------------------------------------------------------- |
| `/shop`        | `src/app/shop/layout.tsx`        | Also wraps `/shop/[slug]`; slug page's `generateMetadata` overrides it |
| `/collections` | `src/app/collections/layout.tsx` | Also wraps `/collections/[slug]`                                       |
| `/about`       | `src/app/about/layout.tsx`       | Thin pass-through; page is `'use client'`                              |
| `/checkout`    | `src/app/checkout/layout.tsx`    | Thin pass-through; page is `'use client'`                              |

All layout wrappers follow the same pattern:

```ts
export const metadata: Metadata = { title: '...', description: '...' }
export default function XLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

`src/app/metadata.ts` is a legacy file — superseded by the root layout export.

---

## Path alias

`@/*` maps to `src/*`. Configured by Next.js default tsconfig. Always use `@/` imports; never use relative `../../` paths.

---

## Scroll behaviour

- `overscroll-behavior: none` on body — removes elastic bounce, gives confident weighted scroll
- `scroll-behavior: smooth` on html
- No scroll-snap on shop page — free scroll, no snapping between cards

---

## Key rules

1. **All API calls through `src/lib/api.ts`** — never inline fetch in components.
2. **TanStack Query for all server-state queries** — same `queryKey` across the app = shared cache, no duplicate requests.
3. **`@/` path alias for all imports** — never use relative `../../` paths.
4. **Cart operations only via `useCartStore` actions** — do not mutate cart state directly.
5. **Always sort product media by `sortOrder`** before rendering (this is done by the API, but verify in UI components).
6. **Respect `prefers-reduced-motion`** in all animated components via `useReducedMotion()`.
7. **Use `sessionStorage` for one-time UI gates** (intro screen, order number on confirmation) — not state, not cookies.

---

## What is NOT built yet

- Mobile navigation menu — desktop nav is complete, no hamburger/drawer for mobile
- Search integration — navbar search icon renders but does nothing; search param wired in API but not exposed in UI
- Product recommendations — no "similar products" section yet (RelatedScroll on PDP is a placeholder)
