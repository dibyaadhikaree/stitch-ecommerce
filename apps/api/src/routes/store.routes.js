import { Router } from "express";

import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Collection } from "../models/Collection.js";
import { PromoCode } from "../models/PromoCode.js";
import { Setting } from "../models/Setting.js";
import { StorefrontConfig } from "../models/StorefrontConfig.js";
import { createOrder } from "../services/order.service.js";
import { resolvePromoCode, computeDiscount } from "./promo.routes.js";

const router = Router();

// Fields that must never be exposed publicly
const PRIVATE_FIELDS = "-buyingPrice -extraCost -costPrice -variants.sold";

router.get("/homepage", async (_req, res) => {
  const [config, featuredProducts, collections] = await Promise.all([
    StorefrontConfig.getSingleton(),
    Product.find({
      featured: true,
      status: "active",
    })
      .select(PRIVATE_FIELDS)
      .populate("category", "name slug")
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(12)
      .lean(),
    Collection.find({ isActive: { $ne: false } })
      .select("name slug coverImage description sortOrder")
      .sort({ sortOrder: 1 })
      .lean(),
  ]);

  const heroSlides = config.heroSlides
    .filter((s) => s.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return res.json({
    item: {
      heroSlides,
      announcementBar: config.announcementBar,
      featuredSectionTitle: config.featuredSectionTitle,
      featuredProducts,
      collections,
    },
  });
});

router.get("/products", async (req, res) => {
  const {
    category,
    collection,
    inStock,
    search,
    sort = "newest",
    page = "1",
    limit: limitParam = "24",
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(48, Math.max(1, parseInt(limitParam, 10) || 24));
  const skip = (pageNum - 1) * limitNum;

  const filter = { status: "active", shopVisible: true };

  if (search) {
    filter.name = {
      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }

  if (collection) {
    const col = await Collection.findOne({ slug: collection }).lean();
    filter.productCollection = col ? col.name : collection;
  }

  if (inStock === "true") {
    filter["variants.0"] = { $exists: true };
    filter.variants = { $elemMatch: { stock: { $gt: 0 } } };
  }

  if (category) {
    const cat = await Category.findOne({ slug: category }).lean();
    if (cat) {
      filter.category = cat._id;
    } else {
      return res.json({ items: [], total: 0, page: pageNum, pages: 0 });
    }
  }

  const sortMap = {
    newest: { sortOrder: 1, createdAt: -1 },
    price_asc: { sellingPrice: 1 },
    price_desc: { sellingPrice: -1 },
  };
  const sortOrder = sortMap[sort] ?? sortMap.newest;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .select(PRIVATE_FIELDS)
      .populate("category", "name slug")
      .sort(sortOrder)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return res.json({
    items,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

router.get("/products/:slug", async (req, res) => {
  const { slug } = req.params;

  const item = await Product.findOne({ slug, status: "active" })
    .select(PRIVATE_FIELDS)
    .populate("category", "name slug")
    .lean();

  if (!item) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.json({ item });
});

router.get("/categories", async (_req, res) => {
  try {
    const categories = await Category.find()
      .select("name slug description")
      .lean();

    const populated = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({
          category: cat._id,
          status: "active",
          shopVisible: true,
        });
        return { ...cat, productCount: count };
      }),
    );

    const active = populated.filter((c) => c.productCount > 0);
    res.json(active);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/settings", async (_req, res) => {
  const raw = await Setting.findOne().lean();

  return res.json({
    item: {
      shopName: raw?.shopName ?? "STITCH Studio",
      currency: raw?.currency ?? "NPR",
      acceptedPaymentMethods: raw?.acceptedPaymentMethods ?? [],
      lowStockThreshold: raw?.lowStockThreshold ?? 5,
      sizeGuide: raw?.sizeGuide ?? {},
      aboutHeadline: raw?.aboutHeadline ?? "",
      aboutBody: raw?.aboutBody ?? "",
      aboutImageUrl: raw?.aboutImageUrl ?? "",
      instagramHandle: raw?.instagramHandle ?? "",
      tiktokHandle: raw?.tiktokHandle ?? "",
      whatsappNumber: raw?.whatsappNumber ?? "",
      shippingNote: raw?.shippingNote ?? "",
      returnPolicy: raw?.returnPolicy ?? "",
      footerTagline: raw?.footerTagline ?? "",
      seoTitle: raw?.seoTitle ?? "STITCH",
      seoDescription: raw?.seoDescription ?? "Premium minimal fashion.",
    },
  });
});

router.get("/collections", async (_req, res) => {
  const collections = await Collection.find({ isActive: { $ne: false } })
    .select("name slug coverImage description sortOrder")
    .sort({ sortOrder: 1 })
    .lean();

  return res.json(collections);
});

router.post("/orders", async (req, res) => {
  const { customerName, phone, address, city, note, items, promoCode } =
    req.body ?? {};

  if (!customerName || !phone) {
    return res
      .status(400)
      .json({ message: "Customer name and phone are required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ message: "Order must contain at least one item" });
  }

  for (const item of items) {
    const product = await Product.findById(item.productId)
      .select("name variants")
      .lean();
    if (!product) {
      return res
        .status(400)
        .json({ message: "A product in your cart is no longer available" });
    }
    const variant = product.variants.find(
      (v) => String(v._id) === String(item.variantId),
    );
    if (!variant) {
      return res
        .status(400)
        .json({ message: "A selected size is no longer available" });
    }
    if (variant.stock < (Number(item.quantity) || 1)) {
      const available = variant.stock;
      return res.status(400).json({
        message:
          available === 0
            ? `${product.name} (${variant.size}) is out of stock`
            : `Only ${available} unit${available === 1 ? "" : "s"} of ${product.name} (${variant.size}) available`,
      });
    }
  }

  const fullAddress = [address, city].filter(Boolean).join(", ");

  // Compute cart total from validated items
  let cartTotal = 0;
  for (const item of items) {
    const product = await Product.findById(item.productId)
      .select("sellingPrice")
      .lean();
    if (product)
      cartTotal += product.sellingPrice * (Number(item.quantity) || 1);
  }

  let appliedPromo = null;
  if (promoCode) {
    let promo;
    try {
      promo = await resolvePromoCode(promoCode, cartTotal);
    } catch (err) {
      return res.status(err.status || 400).json({ message: err.message });
    }
    const discount = computeDiscount(promo.type, promo.value, cartTotal);
    appliedPromo = {
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discount,
    };
    await PromoCode.findByIdAndUpdate(promo._id, { $inc: { usedCount: 1 } });
  }

  const order = await createOrder({
    customerName,
    phone,
    address: fullAddress,
    channel: "website",
    paymentStatus: "Unpaid",
    note,
    items,
    appliedPromo,
  });

  return res.status(201).json({
    success: true,
    orderNumber: order.orderNumber,
    orderId: String(order._id),
  });
});

export default router;
