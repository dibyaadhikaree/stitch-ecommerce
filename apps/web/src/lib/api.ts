const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export type AdminUser = {
  name: string;
  email: string;
  role: string;
};

export type Category = {
  _id: string;
  name: string;
  slug: string;
  description: string;
};

export type ProductVariant = {
  id?: string;
  size: string;
  sku: string;
  stock: number;
  sold: number;
  lowStockThreshold?: number | null;
};

export type ProductMedia = {
  _id?: string;
  url: string;
  type: "image" | "video";
  tag: "front" | "back" | "detail" | "lifestyle" | "untagged";
  isPrimary: boolean;
  sortOrder: number;
  originalName?: string;
};

export type Product = {
  _id: string;
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  collection?: string;
  productCollection: string;
  media: ProductMedia[];
  featured?: boolean;
  shopVisible?: boolean;
  sortOrder?: number;
  buyingPrice: number;
  extraCost: number;
  costPrice: number;
  sellingPrice: number;
  marketPrice: number;
  status: string;
  stock: number;
  sold: number;
  variants: ProductVariant[];
};

export type Channel = "instagram" | "facebook" | "website" | "manual";

export type Customer = {
  _id: string;
  name: string;
  phone: string;
  address: string;
  channel: Channel;
  notes: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
};

export type DashboardPayload = {
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  codOutstanding: number;
  totalOrders: number;
  ordersThisWeek: number;
  activeOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  topProducts: {
    name: string;
    totalSold: number;
    revenue: number;
  }[];
  lowStockProducts: {
    productId: string;
    productName: string;
    size: string;
    stock: number;
  }[];
  revenueByWeek: {
    week: string;
    revenue: number;
    profit: number;
  }[];
  recentOrders: {
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    paymentStatus: string;
  }[];
  channelBreakdown: {
    channel: string;
    orderCount: number;
    revenue: number;
  }[];
  returnRate: number;
  repeatCustomerRate: number;
  avgOrderValue: { currentWeek: number; lastWeek: number };
};

export type InventoryLog = {
  _id: string;
  product: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  size?: string;
  source?: string;
  loggedBy?: string;
  type: string;
  quantity: number;
  note: string;
  createdAt: string;
  image?: string;
  media?: ProductMedia[];
};

export type InventoryStockCorrectionPayload = {
  productId: string;
  variantId: string;
  stock: number;
  note?: string;
};

export type ProductNewVariantPayload = {
  size: string;
  sku?: string;
  stock: number;
};

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type PaymentStatus =
  | "unpaid"
  | "cash"
  | "bank_transfer"
  | "cod"
  | "esewa"
  | "khalti";

export type Order = {
  _id: string;
  orderNumber: string;
  customer?: string;
  customerName: string;
  phone: string;
  customerPhone?: string;
  address: string;
  customerAddress?: string;
  channel: Channel;
  trackingNumber?: string;
  codCollected?: boolean;
  hasReturn?: boolean;
  returnRef?: string;
  returnInfo?: {
    returnedAt: string | null;
    reason: string;
    restocked: boolean;
    note: string;
  } | null;
  paymentStatus: PaymentStatus | string;
  orderStatus: OrderStatus;
  note: string;
  notes?: string;
  stockApplied?: boolean;
  lifecycleEvents?: {
    status: string;
    changedAt: string;
    note: string;
  }[];
  totalAmount: number;
  items: {
    product: string;
    productName: string;
    variantId: string;
    sku: string;
    size: string;
    quantity: number;
    price: number;
    lineTotal: number;
  }[];
  createdAt: string;
};

export type Expense = {
  _id: string;
  title: string;
  category: string;
  amount: number;
  note: string;
  incurredAt: string;
};

export type Settings = {
  _id?: string;
  shopName: string;
  currency: string;
  lowStockThreshold: number;
  acceptedPaymentMethods: PaymentStatus[];
  aboutHeadline?: string;
  aboutBody?: string;
  aboutImageUrl?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  whatsappNumber?: string;
  sizeGuide?: Record<string, string>;
  seoTitle?: string;
  seoDescription?: string;
  footerTagline?: string;
  shippingNote?: string;
  returnPolicy?: string;
};

function normalizeProduct(item: Product): Product {
  const resolvedId = item._id ?? item.id;
  return {
    ...item,
    _id: resolvedId,
    id: item.id ?? resolvedId,
    productCollection: item.productCollection ?? item.collection ?? "",
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(data?.message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function login(payload: { email: string; password: string }) {
  return request<{ token: string; admin: AdminUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMe(token: string) {
  return request<{ admin: AdminUser }>("/auth/me", {}, token);
}

export function getDashboard(token: string) {
  return request<DashboardPayload>("/dashboard", {}, token);
}

export function getCategories(token: string) {
  return request<{ items: Category[] }>("/categories", {}, token);
}

export function createCategory(
  token: string,
  payload: { name: string; description: string },
) {
  return request<{ item: Category }>(
    "/categories",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export function deleteCategory(token: string, id: string) {
  return request<{ ok: boolean }>(
    `/categories/${id}`,
    { method: "DELETE" },
    token,
  );
}

export function getProducts(token: string) {
  return request<{ items: Product[] }>("/products", {}, token).then((data) => ({
    ...data,
    items: data.items.map(normalizeProduct),
  }));
}

export function getProductById(token: string, id: string) {
  return request<{ item: Product }>(`/products/${id}`, {}, token).then(
    (data) => ({
      ...data,
      item: normalizeProduct(data.item),
    }),
  );
}

export type ProductsPage = {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
};

export function getProductsWithFilters(
  token: string,
  filters: {
    q?: string;
    category?: string;
    collection?: string;
    sort?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
) {
  const search = new URLSearchParams();
  if (filters.q) search.set("q", filters.q);
  if (filters.category) search.set("category", filters.category);
  if (filters.collection) search.set("collection", filters.collection);
  if (filters.sort) search.set("sort", filters.sort);
  if (filters.status) search.set("status", filters.status);
  if (filters.page) search.set("page", String(filters.page));
  if (filters.limit) search.set("limit", String(filters.limit));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<ProductsPage>(`/products${suffix}`, {}, token).then(
    (data) => ({
      ...data,
      items: data.items.map(normalizeProduct),
    }),
  );
}

export function createProduct(token: string, payload: Record<string, unknown>) {
  return request<{ item: Product }>(
    "/products",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export function updateProduct(
  token: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return request<{ item: Product }>(
    `/products/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export function appendProductVariants(
  token: string,
  product: Product,
  variants: ProductNewVariantPayload[],
) {
  return updateProduct(token, product.id, {
    name: product.name,
    categoryId: product.categoryId,
    collection: product.collection || "",
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    marketPrice: product.marketPrice,
    media: product.media,
    newVariants: variants,
  });
}

export function deleteProduct(token: string, id: string) {
  return request<{ ok: boolean }>(
    `/products/${id}`,
    { method: "DELETE" },
    token,
  );
}

export function reorderProductMedia(
  token: string,
  productId: string,
  media: Pick<ProductMedia, "_id" | "sortOrder" | "tag" | "isPrimary">[],
) {
  return request<{ product: Product }>(
    `/products/${productId}/media/reorder`,
    { method: "PATCH", body: JSON.stringify({ media }) },
    token,
  );
}

export function reorderProducts(
  token: string,
  order: { id: string; sortOrder: number }[],
): Promise<void> {
  return request<void>(
    "/products/reorder",
    { method: "PATCH", body: JSON.stringify({ order }) },
    token,
  );
}

// Customers
export function getCustomers(
  token: string,
  params: { page?: number; limit?: number; phone?: string } = {},
) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.phone) search.set("phone", params.phone);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<{
    items: Customer[];
    total: number;
    page: number;
    limit: number;
  }>(`/customers${suffix}`, {}, token);
}

export function getCustomerById(token: string, id: string) {
  return request<{ item: Customer; orders: Order[] }>(
    `/customers/${id}`,
    {},
    token,
  );
}

export function createCustomer(
  token: string,
  payload: Record<string, unknown>,
) {
  return request<{ item: Customer }>(
    "/customers",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export function updateCustomer(
  token: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return request<{ item: Customer }>(
    `/customers/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

// Orders
export type OrdersPage = {
  items: Order[];
  total: number;
  page: number;
  totalPages: number;
};

export function getOrders(
  token: string,
  filters: {
    orderStatus?: string;
    channel?: string;
    paymentStatus?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.orderStatus) params.set("orderStatus", filters.orderStatus);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.search) params.set("search", filters.search);
  if (filters.page && filters.page > 1)
    params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<OrdersPage>(`/orders${suffix}`, {}, token);
}

export async function getPendingOrderCount(token: string) {
  const data = await request<OrdersPage>(
    "/orders?orderStatus=Pending&limit=1",
    {},
    token,
  );
  return { count: data.total };
}

export function createOrder(token: string, payload: Record<string, unknown>) {
  return request<{ item: Order }>(
    "/orders",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export function updateOrderStatus(
  token: string,
  id: string,
  payload: Record<string, unknown>,
) {
  return request<{ item: Order }>(
    `/orders/${id}/status`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export function updateOrder(
  token: string,
  id: string,
  payload: {
    status?: string;
    paymentStatus?: PaymentStatus;
    customerPhone?: string;
    customerAddress?: string;
    notes?: string;
    trackingNumber?: string;
  },
) {
  return request<{ item: Order }>(
    `/orders/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export function updateOrderTracking(
  token: string,
  orderId: string,
  trackingNumber: string,
) {
  return updateOrder(token, orderId, { trackingNumber });
}

export function deleteOrder(token: string, id: string) {
  return request<{ ok: boolean }>(`/orders/${id}`, { method: "DELETE" }, token);
}

export function createReturn(
  token: string,
  orderId: string,
  data: {
    reason: string;
    restock?: boolean;
  },
) {
  return request<{ item: Order }>(
    `/orders/${orderId}/return`,
    { method: "POST", body: JSON.stringify(data) },
    token,
  );
}

// Inventory
export function getInventory(
  token: string,
  filters: {
    productId?: string;
    from?: string;
    to?: string;
    type?: string;
  } = {},
) {
  const search = new URLSearchParams();
  if (filters.productId) search.set("productId", filters.productId);
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  if (filters.type) search.set("type", filters.type);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<{ items: InventoryLog[] }>(`/inventory${suffix}`, {}, token);
}

export function createInventoryAdjustment(
  token: string,
  payload: Record<string, unknown>,
) {
  return request<{ item: InventoryLog }>(
    "/inventory/adjust",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export function correctInventoryStock(
  token: string,
  payload: InventoryStockCorrectionPayload,
) {
  return request<{ item: InventoryLog }>(
    "/inventory/adjust-stock",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export function createInventoryStockIn(
  token: string,
  payload: {
    productId: string;
    entries: { variantId: string; quantity: number }[];
  },
) {
  return request<{ items: InventoryLog[] }>(
    "/inventory/stock-in",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

// Expenses
export function getExpenses(token: string) {
  return request<{ items: Expense[] }>("/expenses", {}, token);
}

export function createExpense(token: string, payload: Record<string, unknown>) {
  return request<{ item: Expense }>(
    "/expenses",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export function deleteExpense(token: string, id: string) {
  return request<{ ok: boolean }>(
    `/expenses/${id}`,
    { method: "DELETE" },
    token,
  );
}

// Settings
export function getSettings(token: string) {
  return request<{ item: Settings }>("/settings", {}, token);
}

export function updateSettings(token: string, payload: Settings) {
  return request<{ item: Settings }>(
    "/settings",
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

// ── Storefront Config types ──────────────────────────────────────────────────

export type HeroSlide = {
  _id?: string;
  image: string;
  videoUrl?: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  sortOrder: number;
};

export type StorefrontConfig = {
  heroSlides: HeroSlide[];
  announcementBar: {
    text: string;
    isActive: boolean;
    link: string;
  };
  featuredSectionTitle: string;
  featuredProductOrder?: string[];
};

// ── Storefront API functions ─────────────────────────────────────────────────

export function getStorefrontConfig(token: string) {
  return request<{ config: StorefrontConfig }>("/storefront", {}, token);
}

export function updateAnnouncement(
  token: string,
  data: { text: string; isActive: boolean; link: string },
) {
  return request<{ config: StorefrontConfig }>(
    "/storefront/announcement",
    { method: "PATCH", body: JSON.stringify(data) },
    token,
  );
}

export function updateFeaturedTitle(token: string, title: string) {
  return request<{ config: StorefrontConfig }>(
    "/storefront/featured-title",
    { method: "PATCH", body: JSON.stringify({ featuredSectionTitle: title }) },
    token,
  );
}

export function addHeroSlide(token: string, slide: Omit<HeroSlide, "_id">) {
  return request<{ config: StorefrontConfig }>(
    "/storefront/hero",
    { method: "POST", body: JSON.stringify(slide) },
    token,
  );
}

export function updateHeroSlide(
  token: string,
  slideId: string,
  slide: Partial<HeroSlide>,
) {
  return request<{ config: StorefrontConfig }>(
    `/storefront/hero/${slideId}`,
    { method: "PATCH", body: JSON.stringify(slide) },
    token,
  );
}

export function deleteHeroSlide(token: string, slideId: string) {
  return request<{ config: StorefrontConfig }>(
    `/storefront/hero/${slideId}`,
    { method: "DELETE" },
    token,
  );
}

export function reorderHeroSlides(token: string, order: string[]) {
  return request<{ config: StorefrontConfig }>(
    "/storefront/hero/reorder",
    { method: "PATCH", body: JSON.stringify({ order }) },
    token,
  );
}

export function reorderFeaturedProducts(
  token: string,
  order: string[],
): Promise<void> {
  return request<void>(
    "/storefront/featured-order",
    { method: "PATCH", body: JSON.stringify({ order }) },
    token,
  );
}

export function toggleProductFeatured(
  token: string,
  productId: string,
  featured: boolean,
) {
  return request<{ product: Product }>(
    `/products/${productId}/featured`,
    { method: "PATCH", body: JSON.stringify({ featured }) },
    token,
  );
}

export function setProductShopVisibility(
  token: string,
  id: string,
  shopVisible: boolean,
): Promise<Product> {
  return request<{ product: Product }>(
    `/products/${id}/visibility`,
    { method: "PATCH", body: JSON.stringify({ shopVisible }) },
    token,
  ).then((data) => data.product);
}

// ── Collections ──────────────────────────────────────────────────────────────

export type Collection = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  sortOrder: number;
  isActive: boolean;
};

export function getCollections(token: string) {
  return request<{ items: Collection[] }>("/collections", {}, token);
}

export function createCollection(
  token: string,
  payload: { name: string; description: string; coverImage: string },
) {
  return request<{ item: Collection }>(
    "/collections",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export function updateCollection(
  token: string,
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    coverImage: string;
    isActive: boolean;
  }>,
) {
  return request<{ item: Collection }>(
    `/collections/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export function deleteCollection(token: string, id: string) {
  return request<{ ok: boolean }>(
    `/collections/${id}`,
    { method: "DELETE" },
    token,
  );
}

export function reorderCollections(
  token: string,
  order: { id: string; sortOrder: number }[],
): Promise<void> {
  return request<void>(
    "/collections/reorder",
    { method: "PATCH", body: JSON.stringify({ order }) },
    token,
  );
}

export function setCollectionProducts(
  token: string,
  collectionId: string,
  productIds: string[],
): Promise<void> {
  return request<void>(
    `/collections/${collectionId}/products`,
    { method: "PATCH", body: JSON.stringify({ productIds }) },
    token,
  );
}

// ── Promo Codes ──────────────────────────────────────────────────────────────

export type PromoCode = {
  _id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrderValue: number;
  maxUses: number | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  usedCount: number;
};

export function getPromoCodes(token: string) {
  return request<{ items: PromoCode[] }>("/promo", {}, token);
}

export function createPromoCode(
  token: string,
  data: Omit<PromoCode, "_id" | "usedCount" | "createdAt">,
) {
  return request<{ item: PromoCode }>(
    "/promo",
    { method: "POST", body: JSON.stringify(data) },
    token,
  );
}

export function togglePromoCode(token: string, id: string, isActive: boolean) {
  return request<{ item: PromoCode }>(
    `/promo/${id}`,
    { method: "PATCH", body: JSON.stringify({ isActive }) },
    token,
  );
}

export function deletePromoCode(token: string, id: string) {
  return request<{ ok: boolean }>(`/promo/${id}`, { method: "DELETE" }, token);
}

export async function uploadImage(token: string, file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(data?.message || `Upload failed with ${response.status}`);
  }

  return response.json() as Promise<{
    item: { name: string; url: string; originalName: string };
  }>;
}
