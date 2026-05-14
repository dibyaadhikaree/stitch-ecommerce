# STICH CLOTHING

A full-stack monorepo for STICH CLOTHING — a premium minimal fashion brand. Built for editorial retail: a customer-facing storefront, an internal inventory and order management system, and a REST API that connects them.

Admin Panel : https://stitch-ecommerce-admin.vercel.app/
    Username : admin@gmail.com  
    Password : admin123

Storefront : https://stitch-ecommerce-storefront.vercel.app/

---

## What's inside

```
stich/
├── apps/
│   ├── api/          Express + MongoDB REST API          (port 4000)
│   ├── web/          Admin panel — Next.js               (port 3000)
│   └── web-store/    Customer storefront — Next.js       (port 3001)
```

The three apps are independent — each has its own `package.json`, `.env`, and deployment target. They communicate only through the API.

---

## Stack

| Layer      | Technology                                                          |
| ---------- | ------------------------------------------------------------------- |
| API        | Express 5, Mongoose, MongoDB Atlas                                  |
| Admin      | Next.js 16, React 19, TypeScript, TanStack Query, Zustand, Radix UI |
| Storefront | Next.js 15, TypeScript, Framer Motion, TanStack Query, Zustand      |
| Styling    | Tailwind CSS (both Next.js apps), custom CSS design tokens          |
| Images     | Cloudinary                                                          |
| Auth       | JWT (7-day), admin credentials via environment variables            |
| Email      | Nodemailer via Gmail SMTP                                           |

---

## Features

### Storefront (`apps/web-store`)

- Dark-mode editorial design with Framer Motion throughout
- Homepage with CMS-controlled hero video/image, announcement bar, featured products, and collection strips
- `/shop` — product grid with category filter, sort controls, and live search overlay
- `/shop/[slug]` — full-screen 3-column product detail page: image slider, product info, purchase panel with size selector, low-stock indicators, and "You may like" infinite scroll
- `/collections` and `/collections/[slug]` — collection pages with admin-controlled product groupings
- `/about` — fully CMS-driven editorial brand page
- Cart with persistent Zustand store, slide-in drawer, quantity management
- Guest checkout — COD only, no account required
- Order confirmation page
- Mobile navigation with fullscreen Framer Motion overlay
- SEO metadata on all pages via Next.js `generateMetadata`
- Promo code field at checkout with server-side validation
- Sale price display with strikethrough compare-at price

### Admin panel (`apps/web`)

- Secure login with JWT authentication
- **Dashboard** — revenue, profit, order counts, 8-week bar chart, top products, low-stock alerts
- **Catalog** — product grid with full create/edit: name, category, collection, pricing with auto margin calculation, multi-image upload with drag-to-reorder, tag and primary image controls, variant management
- **Storefront CMS** — controls everything the customer sees:
  - Shop display: toggle which products appear in `/shop`, drag to set display order
  - Featured products: star toggle per product, drag to reorder homepage scroll section
  - Hero slides: image + video URL, headline, CTA, reorder, active toggle
  - Announcement bar: text, link, active toggle
  - Collections: full CRUD, cover image, graphical product picker, drag to reorder
- **Orders** — four-lane kanban (Pending → Confirmed → Shipped → Delivered), order modal with status transitions, tracking number entry, return registration
- **Customers** — paginated list, phone search, order history per customer
- **Inventory** — per-variant stock management, stock-in, adjustments, correction, full audit log
- **Promotions** — promo code CRUD: percent-off or flat-amount, min order value, max uses, expiry date
- **Expenses** — expense ledger with categories
- **Settings** — shop config, low-stock threshold, payment methods, size guides per category, brand content (about page text + images, social handles, shipping and return policies, SEO fields), subscriber management, contact message inbox

### API (`apps/api`)

- Public storefront endpoints (`/api/store/*`) — no auth required
- Protected admin endpoints — JWT Bearer required
- Order service with enforced state machine and stock lifecycle
- Cloudinary image upload with Multer memory storage
- Email notification to admin on new order via Nodemailer
- Promo code validation with server-side re-validation at order creation
- HMAC-verified webhook endpoint for idempotent order creation
- Single-document singleton pattern for Settings and StorefrontConfig

---

## Getting started

### Prerequisites

- Node.js 20+
- A MongoDB Atlas cluster (free M0 is enough to start)
- A Cloudinary account (free tier)
- Gmail account with an [App Password](https://myaccount.google.com/apppasswords) generated

### 1. Clone and install

```bash
git clone https://github.com/yourname/stich.git
cd stich
# install dependencies for all three apps
cd apps/api && npm install
cd ../web && npm install
cd ../web-store && npm install
```

### 2. Environment variables

**`apps/api/.env`** — copy from `apps/api/.env.example`

```env
PORT=4000
CLIENT_URL=http://localhost:3000,http://localhost:3001

MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret_here

ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=your_password_here

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_UPLOAD_FOLDER=stich

GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password

WEBHOOK_SECRET=your_webhook_secret_here
```

**`apps/web/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

**`apps/web-store/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 3. Run in development

Open three terminal windows:

```bash
# Terminal 1 — API
cd apps/api
npm run dev

# Terminal 2 — Admin panel
cd apps/web
npm run dev

# Terminal 3 — Storefront
cd apps/web-store
npm run dev
```

| App        | URL                   |
| ---------- | --------------------- |
| API        | http://localhost:4000 |
| Admin      | http://localhost:3000 |
| Storefront | http://localhost:3001 |

Log in to the admin panel with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in the API `.env`.

---

## Deployment

The recommended setup is **Vercel** for both Next.js apps and **Railway** for the API, with MongoDB Atlas and Cloudinary remaining as managed services.

### Domain structure

```
www.yourdomain.com        →  apps/web-store  (Vercel)
admin.yourdomain.com      →  apps/web        (Vercel)
api.yourdomain.com        →  apps/api        (Railway)
```

### Deploy the API (Railway)

1. Create a new project on [railway.app](https://railway.app) from your GitHub repo
2. Set the root directory to `apps/api`
3. Add all variables from `apps/api/.env` in the Railway variables panel
4. Update `CLIENT_URL` to your production domain values
5. Add the custom domain `api.yourdomain.com` in Railway settings

### Deploy the storefront (Vercel)

1. New project on [vercel.com](https://vercel.com) from your GitHub repo
2. Root directory: `apps/web-store`
3. Framework preset: Next.js
4. Environment variable: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`
5. Add custom domain `www.yourdomain.com`

### Deploy the admin panel (Vercel)

1. New project — same GitHub repo, different Vercel project
2. Root directory: `apps/web`
3. Environment variable: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api`
4. Add custom domain `admin.yourdomain.com`

### Continuous deployment

Both Vercel projects and Railway watch your `main` branch. Push to GitHub and all three services redeploy automatically — typically within 2–3 minutes.

```bash
git add .
git commit -m "your change"
git push origin main
```

Use a `staging` branch to get preview URLs on Vercel before merging to production.

---

## Project structure

```
apps/api/
├── src/
│   ├── config/         env.js, db.js
│   ├── lib/            slugify.js, mailer.js
│   ├── middleware/     auth.js (JWT)
│   ├── models/         Product, Order, Customer, Category,
│   │                   Collection, Setting, StorefrontConfig,
│   │                   PromoCode, Subscriber, Expense,
│   │                   InventoryLog, WebhookEvent
│   ├── routes/         one file per resource
│   └── services/       order.service.js
└── server.js

apps/web/
└── src/
    ├── app/            Next.js App Router — (admin) route group
    ├── components/
    │   ├── views/      one view per admin section
    │   ├── ui/         Radix-based primitives
    │   └── admin/      shared atoms (FormField, MiniStat, etc.)
    └── lib/            api.ts, auth-store.ts, utils.ts

apps/web-store/
└── src/
    ├── app/            shop/, collections/, checkout/, about/
    ├── components/
    │   ├── home/       HeroSection, ProductScrollSection,
    │   │               CollectionsStrip, IntroScreen
    │   ├── layout/     Navbar, CartDrawer, Footer, SearchOverlay
    │   ├── shop/       ProductCard, CategoryBar
    │   └── product/    ImageSlider, ProductInfo, PurchasePanel,
    │                   RelatedScroll, Accordion
    ├── hooks/          useReducedMotion.ts
    └── lib/            api.ts, cart-store.ts, utils.ts
```

---

## Key design decisions

**Product visibility is separate from inventory status.** A product with `status: active` exists in the system. A product with `shopVisible: true` appears in the store. This lets you prepare products fully — price, images, variants — before launching them publicly.

**No customer accounts at checkout.** Orders are placed as a guest with name and phone. The Customer record is created or matched by phone number automatically. Accounts can be layered in later.

**COD only.** Cash on delivery is the default and only payment method. Payment gateway integration (Khalti, eSewa) is planned for a future version.

**One admin, no roles.** Authentication is a single set of credentials from environment variables. Multi-user with roles can be added later when the team grows.

**All order mutations go through the order service.** `apps/api/src/services/order.service.js` is the single source of truth for order state changes, stock adjustments, and customer stat sync. Never write directly to the Order collection from routes.
