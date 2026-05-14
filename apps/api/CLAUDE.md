# CLAUDE.md — apps/api

## What this app is

Express 5 + MongoDB (Mongoose) REST API for STITCH Studio. Runs on **port 4000**. Serves:

- A protected admin API (all routes except those listed as public below)
- A public storefront API (`/api/store/*`) consumed by `apps/web-store`
- A protected CMS API (`/api/storefront/*`) for managing website content (hero slides, announcement bar, featured products)

---

## Commands

Run from `apps/api/`:

```bash
npm run dev    # nodemon dev server on http://localhost:4000
npm start      # production server
```

---

## Environment variables

Copy `.env.example` to `.env`. All variables are imported from `src/config/env.js` — never read `process.env` directly anywhere else.

| Variable                                                                 | Purpose                                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `PORT`                                                                   | Server port (default 4000)                                                        |
| `CLIENT_URL`                                                             | Comma-separated CORS origins (e.g. `http://localhost:3000,http://localhost:3001`) |
| `MONGODB_URI`                                                            | MongoDB connection string                                                         |
| `JWT_SECRET`                                                             | Secret for signing 7-day JWTs                                                     |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                                         | Hardcoded admin credentials (no user DB)                                          |
| `WEBHOOK_SECRET`                                                         | HMAC-SHA256 secret for verifying website order webhooks                           |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials                                                            |
| `CLOUDINARY_UPLOAD_FOLDER`                                               | Cloudinary folder for uploaded product images                                     |
| `GMAIL_USER`                                                             | Gmail address for sending order notifications (default '')                        |
| `GMAIL_APP_PASSWORD`                                                     | Gmail app-specific password for SMTP auth (default '')                            |

---

## Architecture

### Entry point — `src/server.js`

CORS (validates against `CLIENT_URL`), morgan logging, JSON body parsing, static `/uploads` for legacy local assets, all routes mounted at `/api`, global error handler (returns `err.message` for <500, generic string for 500+).

### Config — `src/config/`

- **`env.js`** — Single source of truth for all environment variables with defaults. Always import from here.
- **`db.js`** — Mongoose connection with 3-second timeout; warns on failure without crashing.

### Middleware — `src/middleware/`

- **`auth.js`** — `createToken(payload)` (7-day JWT) and `requireAuth` middleware (extracts Bearer token, sets `req.user`, returns 401 if invalid).

### Lib — `src/lib/`

- **`slugify.js`** — URL-safe slug generator used in product, category, and collection creation.
- **`mailer.js`** — Exports `sendNewOrderEmail(order)`. Sends order notification emails via Gmail SMTP. Requires `GMAIL_USER` and `GMAIL_APP_PASSWORD` env vars; silently skips if either is unset. Called fire-and-forget in `createOrder()`.

---

## Routes

Routes are aggregated in `src/routes/index.js`.

### Public routes (no auth)

| Path              | File                 | Description                                                                                                                                                                    |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/auth`           | `auth.routes.js`     | `POST /login` (env credentials → JWT), `GET /me` (protected)                                                                                                                   |
| `/promo/validate` | `promo.routes.js`    | `POST /promo/validate` — validate a promo code (public). Body: `{ code, orderTotal }`. Returns `{ valid, type, value, discount, finalTotal }`. Does NOT increment `usedCount`. |
| `/health`         | `health.routes.js`   | `GET /` returns `{ status, service, timestamp }`                                                                                                                               |
| `/webhooks`       | `webhooks.routes.js` | `POST /orders` — HMAC-verified, idempotent order creation via order service                                                                                                    |
| `/store/*`        | `store.routes.js`    | Public storefront API — see table below                                                                                                                                        |

### Protected routes (require `requireAuth`)

| Path           | File                         | Description                                                                                                                                                                                                  |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/products`    | `products.routes.js`         | Full CRUD; SKU generation, variant management, media upload. `PATCH /:id/featured` toggles featured state. `PATCH /:id/media/reorder` updates sortOrder, tag, isPrimary per subdoc; enforces single primary. |
| `/orders`      | `orders.routes.js`           | Thin wrapper around `order.service.js` — CRUD, status transitions, returns                                                                                                                                   |
| `/inventory`   | `inventory.routes.js`        | Stock query, adjust, correct, stock-in                                                                                                                                                                       |
| `/categories`  | `categories.routes.js`       | `GET /`, `POST /`, `DELETE /:id`                                                                                                                                                                             |
| `/collections` | `collections.routes.js`      | `GET /`, `POST /`, `PATCH /:id`, `PATCH /reorder`, `DELETE /:id`, `PATCH /:id/products` (assign products to collection)                                                                                      |
| `/customers`   | `customers.routes.js`        | Paginated list, phone filter, detail + order history, CRUD                                                                                                                                                   |
| `/dashboard`   | `dashboard.routes.js`        | Revenue/profit, order counts, top products, low-stock, 8-week chart, channel breakdown                                                                                                                       |
| `/expenses`    | `expenses.routes.js`         | `GET /`, `POST /`, `DELETE /:id`                                                                                                                                                                             |
| `/settings`    | `settings.routes.js`         | `GET /`, `PATCH /` singleton settings document                                                                                                                                                               |
| `/uploads`     | `uploads.routes.js`          | `POST /` — Multer memory → Cloudinary; image-only, 10 MB limit                                                                                                                                               |
| `/storefront`  | `storefront.admin.routes.js` | CMS API for hero slides, announcement bar, featured title, featured product order                                                                                                                            |
| `/promo`       | `promo.routes.js`            | `GET /` list all, `POST /` create, `PATCH /:id` toggle isActive, `DELETE /:id` hard delete                                                                                                                   |

### Public storefront API (`/api/store/*`)

| Method | Path              | Description                                                                                                                                                                                                                                                                                                                                  |
| ------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/homepage`       | Returns `{ item: { heroSlides (active, sorted), announcementBar ({ isActive, text, link } — always returned, never null), featuredProducts (up to 12), featuredSectionTitle, collections } }`                                                                                                                                                |
| GET    | `/products`       | Paginated listing — params: `category` (slug), `collection` (slug), `inStock`, `search`, `page`, `limit` (max 48), `sort` (newest/price_asc/price_desc). Returns `{ items, total, page, pages }`. Only returns products with `status: 'active'` and `shopVisible: true`.                                                                     |
| GET    | `/products/:slug` | Single product by slug (active only)                                                                                                                                                                                                                                                                                                         |
| GET    | `/categories`     | Categories that have at least one product with `status: 'active'` and `shopVisible: true`. Returns a plain array (not wrapped in `{ items }`). Each element includes `name`, `slug`, `description`, and `productCount`.                                                                                                                      |
| GET    | `/collections`    | All active collections sorted by sortOrder. Returns raw array.                                                                                                                                                                                                                                                                               |
| GET    | `/settings`       | Public shop info: `shopName`, `acceptedPaymentMethods`, `currency`, `lowStockThreshold`, `sizeGuide`, `shippingNote`, `returnPolicy`, `aboutHeadline`, `aboutBody`, `aboutImageUrl`, `instagramHandle`, `tiktokHandle`, `whatsappNumber`, `footerTagline`, `seoTitle`, `seoDescription`. Never exposes cost/threshold/internal admin fields. |
| POST   | `/orders`         | Order creation from storefront. Validates stock, creates customer if needed, defers stock deduction until order confirmation. Returns `{ success, orderNumber, orderId }`.                                                                                                                                                                   |

---

## Models (`src/models/`)

| Model                 | Key fields / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Product.js`          | `name`, `slug` (unique), `category` (ObjectId ref), `productCollection` (plain String — **not** `collection`), `media[]` (`{url, type, tag, isPrimary, sortOrder, originalName}` — `tag` enum: `front/back/detail/lifestyle/untagged`), `buyingPrice`, `extraCost`, `costPrice`, `sellingPrice`, `marketPrice`, `status` (active/draft/archived), `featured` (Boolean), `shopVisible` (Boolean, controls public visibility), `sortOrder` (Number, used for homepage featured products sort), `variants[]` (`{size, sku, stock, sold, lowStockThreshold}`) |
| `Order.js`            | `orderNumber` (unique), `customer` (ObjectId ref, nullable), `customerName`, `phone`/`customerPhone` (aliases), `items[]` (denormalized snapshot), `orderStatus` (Pending/Confirmed/Shipped/Delivered/Cancelled), `paymentStatus`, `stockApplied`, `codCollected`, `hasReturn`, `returnInfo`, `lifecycleEvents[]`, `appliedPromo` (`{ code, type, value, discount }`, optional), `discountAmount` (default 0), `finalTotal` (totalAmount minus discount)                                                                                                  |
| `Customer.js`         | `name`, `phone` (unique), `address`, `channel`, `notes`, `totalOrders`, `totalSpent` (denormalized, synced by order service)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Category.js`         | `name` (unique, trimmed), `slug` (unique), `description`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Collection.js`       | `name` (unique, trimmed), `slug` (unique, auto-generated), `description`, `coverImage` (Cloudinary URL), `sortOrder` (Number, for admin ordering), `isActive` (Boolean, controls public visibility)                                                                                                                                                                                                                                                                                                                                                       |
| `Setting.js`          | Singleton. `shopName`, `currency` (NPR), `lowStockThreshold`, `acceptedPaymentMethods[]`, `orderSequence` (min 3000), `aboutHeadline`, `aboutBody`, `aboutImageUrl`, `instagramHandle`, `tiktokHandle`, `whatsappNumber`, `seoTitle` (default "STITCH"), `seoDescription` (default "Premium minimal fashion."), `footerTagline`, `shippingNote` (shown in checkout + PDP), `returnPolicy` (shown in PDP Shipping & Returns accordion), `sizeGuide` (Map of String, keyed by category slug)                                                                |
| `PromoCode.js`        | `code` (unique, uppercase, trimmed), `type` (enum: `percent`/`flat`), `value` (Number), `minOrderValue` (default 0), `maxUses` (null = unlimited), `usedCount`, `expiresAt` (null = no expiry), `isActive` (default true). Pre-save hook uppercases and trims `code`.                                                                                                                                                                                                                                                                                     |
| `Expense.js`          | `title`, `category`, `amount`, `note`, `incurredAt`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `InventoryLog.js`     | Immutable audit trail. `product` (ref), `variantId`, `sku`, `size`, `type` (initial/stock_in/sale/return/damage/adjustment), `quantity` (can be negative)                                                                                                                                                                                                                                                                                                                                                                                                 |
| `StorefrontConfig.js` | Singleton via `getSingleton()`. `heroSlides[]` (with fields: `image`, `videoUrl`, `title`, `subtitle`, `ctaText`, `ctaLink`, `isActive`, `sortOrder`), `announcementBar` (`{ text, isActive, link }`), `featuredSectionTitle`. Hero slide `image` field holds full Cloudinary `secure_url` strings.                                                                                                                                                                                                                                                       |
| `WebhookEvent.js`     | `idempotencyKey` (unique), `payload`, `status` — deduplicates website order webhooks                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

---

## Order Service (`src/services/order.service.js`)

Single source of truth for all order operations. Do not write directly to the Order collection outside this service.

| Function                                  | Description                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `createOrder(payload)`                    | Allocates order number, validates and snapshots items, finds/creates customer, initializes lifecycle |
| `transitionOrderStatus(orderId, payload)` | Enforces state machine; handles stock deduction/restoration, COD marking, customer stat sync         |
| `registerOrderReturn(orderId, payload)`   | Marks return on Delivered order; optionally restores stock                                           |
| `updateOrderDetails(orderId, payload)`    | Updates payment/notes/tracking; blocked on terminal states                                           |
| `deleteOrder(orderId)`                    | Restores stock if applied; syncs customer stats                                                      |
| `syncCustomerStats(customerId)`           | Recalculates `totalOrders`/`totalSpent` from live order data                                         |
| `formatOrderForResponse(order)`           | Normalizes all legacy field aliases for API responses                                                |

### Order state machine

`Pending → [Confirmed, Cancelled]` → `Confirmed → [Shipped, Cancelled]` → `Shipped → [Delivered, Cancelled]`

Delivered and Cancelled are terminal.

### Stock lifecycle

- Creating an order does **not** touch stock.
- Stock is deducted when `Pending → Confirmed` (`stockApplied = true`).
- Stock is restored when a `stockApplied` order is Cancelled or returned.

---

## Key rules

1. **Always import env vars from `src/config/env.js`** — never `process.env` directly.
2. **Never expose `buyingPrice`, `extraCost`, `costPrice`, or `variants.sold`** in any public `/api/store/*` route. All store routes use a shared projection string (`-buyingPrice -extraCost -costPrice -variants.sold`) to strip these fields. `marketPrice` IS public — it is a "compare-at" price and must always be included.
3. **Always filter `status: 'active'` and `shopVisible: true`** on public product queries (except `/store/homepage` which filters `featured: true` instead for the featured section).
4. **SKU uniqueness is enforced globally and case-insensitively** across all products and variants.
5. **`productCollection`** is the actual MongoDB field name. Routes serialize it as `collection` in responses. Always query using `productCollection`.
6. **Orders store a denormalized line-item snapshot** — intentionally, so historical orders are unaffected by product changes.
7. **`allocateOrderNumber()`** upserts the Settings document before incrementing `orderSequence` to prevent Mongo conflicts on empty databases.
8. **Delivering a COD order** automatically sets `codCollected = true`. Delivering an unpaid non-COD order is blocked.
9. **Customer metrics** (`totalOrders`, `totalSpent`) are denormalized and must always be synced via `syncCustomerStats()` after relevant order events.
10. **`serializeProduct()` sorts `media[]` by `sortOrder` ascending** before returning. The `PATCH /:id/media/reorder` endpoint is the sole way to update media tags/order without a full product replace; it enforces exactly one `isPrimary` item after every call.
11. **Storefront admin routes respond with `{ config }`**. The admin frontend expects that shape for announcement, featured-title, featured-order, and hero-slide mutations.
12. **Collections are sorted by `sortOrder`** in all public responses. Always include `sort({ sortOrder: 1 })` in collection queries.
13. **`/store/collections` returns a raw array**, not wrapped in `{ items }`. All other `/store/*` endpoints wrap responses in an `item` field (or `items`/`products` for paginated results).
14. **Sale pricing**: A product is on sale when `marketPrice > sellingPrice && marketPrice > 0`. The `marketPrice` field is always public and represents the strikethrough "compare-at" price.

---

## What is NOT built yet

- None — API is feature-complete for current storefront and admin functionality.
