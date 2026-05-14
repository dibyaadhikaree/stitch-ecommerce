const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export type StoreProduct = {
  _id: string;
  name: string;
  slug: string;
  sellingPrice: number;
  marketPrice?: number;
  collection?: string;
  category: { name: string; slug: string };
  media: {
    url: string;
    isPrimary: boolean;
    type: string;
    tag?: string;
    sortOrder?: number;
  }[];
  variants: { _id: string; size: string; stock: number }[];
  featured?: boolean;
};

export type StoreCategory = {
  _id: string;
  name: string;
  slug: string;
  productCount: number;
};

export async function getProducts(params?: {
  category?: string;
  collection?: string;
  sort?: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ products: StoreProduct[]; total: number; pages: number }> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.collection) qs.set("collection", params.collection);
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const res = await fetch(`${BASE}/store/products?${qs}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  const json = await res.json();
  return { products: json.items, total: json.total, pages: json.pages };
}

export async function getCategories(): Promise<StoreCategory[]> {
  const res = await fetch(`${BASE}/store/categories`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("Failed to fetch categories");
  const json = await res.json();
  // API returns a plain array; guard against legacy { items: [...] } shape
  return Array.isArray(json) ? json : (json.items ?? []);
}

export async function getProductBySlug(
  slug: string,
): Promise<{ product: StoreProduct }> {
  const res = await fetch(`${BASE}/store/products/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch product");
  const json = await res.json();
  return { product: json.item };
}

export type StoreCollection = {
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
};

export async function getCollections(): Promise<StoreCollection[]> {
  const res = await fetch(`${BASE}/store/collections`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch collections");
  const json = await res.json();

  return json;
}

export type HeroSlide = {
  imageUrl: string;
  videoUrl?: string;
  headline?: string;
  subtext?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
};

export type HomepageData = {
  heroSlides: HeroSlide[];
  announcementBar: { isActive: boolean; text: string; link?: string };
  featuredProducts: StoreProduct[];
  featuredSectionTitle: string;
  collections: { name: string; slug: string; coverImage?: string }[];
};

export async function getHomepage(): Promise<HomepageData> {
  const res = await fetch(`${BASE}/store/homepage`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch homepage");
  const json = await res.json();

  return json.item;
}

export type StoreSettings = {
  shopName: string;
  currency: string;
  acceptedPaymentMethods: string[];
  lowStockThreshold?: number;
  sizeGuide?: Record<string, string>;
  shippingNote?: string;
  returnPolicy?: string;
  aboutHeadline?: string;
  aboutBody?: string;
  aboutImageUrl?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  whatsappNumber?: string;
  footerTagline?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type CheckoutPayload = {
  customerName: string;
  phone: string;
  address: string;
  city: string;
  note?: string;
  promoCode?: string;
  items: {
    productId: string;
    variantId: string;
    name: string;
    sku: string;
    size: string;
    price: number;
    image: string;
    quantity: number;
  }[];
};

export async function getSettings(): Promise<StoreSettings> {
  const res = await fetch(`${BASE}/store/settings`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("Failed to fetch settings");
  const json = await res.json();

  return json.item;
}

export async function validatePromoCode(
  code: string,
  orderTotal: number,
): Promise<{
  valid: boolean;
  type: string;
  value: number;
  discount: number;
  finalTotal: number;
}> {
  const res = await fetch(`${BASE}/promo/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, orderTotal }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { message?: string }).message ?? "Invalid promo code",
    );
  }
  return res.json();
}

export async function placeOrder(
  payload: CheckoutPayload,
): Promise<{ orderNumber: string }> {
  const res = await fetch(`${BASE}/store/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json as { message?: string }).message ?? "Failed to place order",
    );
  }
  const json = await res.json();
  return { orderNumber: (json as { orderNumber: string }).orderNumber };
}
