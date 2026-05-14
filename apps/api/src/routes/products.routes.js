import { Router } from "express";

import { InventoryLog } from "../models/InventoryLog.js";
import { Product } from "../models/Product.js";
import { slugify } from "../lib/slugify.js";

const router = Router();

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeProduct(product) {
  const media = (product.media || [])
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((m) => ({
      _id: m._id,
      url: m.url,
      type: m.type || "image",
      tag: m.tag || "untagged",
      isPrimary: !!m.isPrimary,
      sortOrder: m.sortOrder ?? 0,
      originalName: m.originalName || "",
    }));

  return {
    id: product._id,
    _id: product._id,
    name: product.name,
    slug: product.slug,
    categoryId: product.category?._id || product.category,
    categoryName: product.category?.name || "",
    collection: product.productCollection || "",
    featured: product.featured ?? false,
    shopVisible: product.shopVisible ?? false,
    sortOrder: product.sortOrder ?? 0,
    media,
    buyingPrice: product.buyingPrice ?? product.costPrice,
    extraCost: product.extraCost ?? 0,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    marketPrice: product.marketPrice ?? product.sellingPrice,
    status: product.status,
    stock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
    sold: product.variants.reduce((sum, variant) => sum + variant.sold, 0),
    variants: product.variants.map((variant) => ({
      id: variant._id,
      size: variant.size,
      sku: variant.sku,
      stock: variant.stock,
      sold: variant.sold,
      lowStockThreshold: variant.lowStockThreshold ?? null,
    })),
  };
}

const VALID_TAGS = new Set([
  "front",
  "back",
  "detail",
  "lifestyle",
  "untagged",
]);

function buildMedia(payload) {
  if (!Array.isArray(payload.media) || !payload.media.length) return [];
  return payload.media.map((item, index) => ({
    url: item.url,
    type: item.type === "video" ? "video" : "image",
    tag: VALID_TAGS.has(item.tag) ? item.tag : "untagged",
    isPrimary: item.isPrimary ?? index === 0,
    sortOrder: item.sortOrder ?? index,
    originalName: item.originalName || "",
  }));
}

function toSkuNameToken(productName) {
  const words = String(productName || "")
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, "").toUpperCase())
    .filter(Boolean);

  if (!words.length) return "STITCH";

  if (words.length === 1) {
    return words[0].slice(0, 5).padEnd(5, "X");
  }

  const first = words[0].slice(0, 2);
  const second = words[1].slice(0, 3);
  return `${first}${second}`.padEnd(5, "X");
}

function buildSku(productName, size, index) {
  const nameToken = toSkuNameToken(productName);
  const sizeToken = String(size || "SIZE")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

  return `${nameToken}-${sizeToken}-${String(index + 1).padStart(2, "0")}`;
}

// Generates a SKU that doesn't collide with any SKU already in `usedSkus`.
// Mutates `usedSkus` to reserve the chosen value for subsequent calls in the same batch.
function buildUniqueSku(productName, size, index, usedSkus) {
  const base = buildSku(productName, size, index);
  if (!usedSkus.has(base)) {
    usedSkus.add(base);
    return base;
  }
  let counter = 2;
  while (usedSkus.has(`${base}-${counter}`)) counter++;
  const unique = `${base}-${counter}`;
  usedSkus.add(unique);
  return unique;
}

function normalizeSize(size) {
  return String(size || "")
    .trim()
    .toLowerCase();
}

function normalizeSku(sku) {
  return String(sku || "")
    .trim()
    .toUpperCase();
}

function createInitialVariantLog(
  product,
  variant,
  { source = "initial", note = "Initial product stock" } = {},
) {
  return {
    product: product._id,
    productName: product.name,
    variantId: variant._id,
    variantLabel: `${product.name} / ${variant.size}`,
    sku: variant.sku,
    size: variant.size,
    source,
    loggedBy: "System",
    type: "initial",
    quantity: variant.stock,
    note,
  };
}

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { sellingPrice: 1 },
  price_desc: { sellingPrice: -1 },
};

router.get("/", async (req, res) => {
  const {
    q = "",
    category = "",
    collection = "",
    sort = "newest",
    status = "",
    page = "1",
    limit = "20",
  } = req.query;

  const filters = {};

  if (category) filters.category = category;
  if (status) filters.status = status;

  if (collection) {
    filters.productCollection = {
      $regex: escapeRegExp(String(collection)),
      $options: "i",
    };
  }

  if (q) {
    const safe = escapeRegExp(String(q));
    filters.$or = [
      { name: { $regex: safe, $options: "i" } },
      { "variants.sku": { $regex: safe, $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(
    500,
    Math.max(1, parseInt(String(limit), 10) || 20),
  );
  const skip = (pageNum - 1) * limitNum;

  // Stock sorts require in-memory sort since stock is computed from variants
  if (sort === "stock_asc" || sort === "stock_desc") {
    const all = await Product.find(filters).populate("category", "name").lean();
    const serialized = all.map(serializeProduct);
    serialized.sort((a, b) =>
      sort === "stock_asc" ? a.stock - b.stock : b.stock - a.stock,
    );
    return res.json({
      items: serialized.slice(skip, skip + limitNum),
      total: serialized.length,
      page: pageNum,
      totalPages: Math.ceil(serialized.length / limitNum) || 1,
    });
  }

  const sortQuery = SORT_MAP[String(sort)] ?? SORT_MAP.newest;

  const [docs, total] = await Promise.all([
    Product.find(filters)
      .populate("category", "name")
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filters),
  ]);

  return res.json({
    items: docs.map(serializeProduct),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  });
});

router.get("/:id", async (req, res) => {
  const item = await Product.findById(req.params.id).populate(
    "category",
    "name",
  );
  if (!item) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.json({ item: serializeProduct(item) });
});

router.post("/", async (req, res) => {
  const payload = req.body ?? {};

  if (
    !payload.name ||
    !payload.categoryId ||
    payload.costPrice === undefined ||
    payload.sellingPrice === undefined
  ) {
    return res
      .status(400)
      .json({
        message: "Name, category, cost price, and selling price are required",
      });
  }

  const existingDocs = await Product.find({}, "variants.sku").lean();
  const usedSkus = new Set(
    existingDocs.flatMap((p) =>
      p.variants.map((v) => normalizeSku(v.sku)).filter(Boolean),
    ),
  );

  const variants = Array.isArray(payload.variants)
    ? payload.variants
        .filter((variant) => variant?.size)
        .map((variant, index) => ({
          size: variant.size,
          sku:
            normalizeSku(variant.sku) ||
            buildUniqueSku(payload.name, variant.size, index, usedSkus),
          stock: Number(variant.stock || 0),
          sold: 0,
        }))
    : [];

  if (!variants.length) {
    return res
      .status(400)
      .json({ message: "At least one size variant is required" });
  }

  const seenSizes = new Set();
  const seenSkus = new Set();
  for (const variant of variants) {
    const ns = normalizeSize(variant.size);
    if (seenSizes.has(ns)) {
      return res.status(400).json({
        message: `Duplicate size found: ${String(variant.size).toUpperCase()}. Each size must be unique within a product.`,
      });
    }
    seenSizes.add(ns);

    const sku = normalizeSku(variant.sku);
    if (seenSkus.has(sku)) {
      return res.status(400).json({
        message: `Duplicate SKU found: ${sku}. Each variant SKU must be unique.`,
      });
    }
    seenSkus.add(sku);
  }

  const existingSkuSet = new Set(
    existingDocs.flatMap((p) =>
      p.variants.map((v) => normalizeSku(v.sku)).filter(Boolean),
    ),
  );

  for (const variant of variants) {
    if (existingSkuSet.has(normalizeSku(variant.sku))) {
      return res.status(400).json({
        message: `SKU already exists: ${variant.sku}. Please use a different SKU.`,
      });
    }
  }

  const media = buildMedia(payload);
  const product = await Product.create({
    name: payload.name,
    slug: slugify(payload.name),
    category: payload.categoryId,
    productCollection: payload.collection || "",
    media,
    buyingPrice: Number(payload.buyingPrice ?? payload.costPrice ?? 0),
    extraCost: Number(payload.extraCost || 0),
    costPrice: Number(payload.costPrice || 0),
    sellingPrice: Number(payload.sellingPrice || 0),
    marketPrice: Number(payload.marketPrice ?? payload.sellingPrice ?? 0),
    status: payload.status || "active",
    variants,
  });

  for (const variant of product.variants) {
    if (variant.stock <= 0) continue;

    await InventoryLog.create(createInitialVariantLog(product, variant));
  }

  const populated = await Product.findById(product._id).populate(
    "category",
    "name",
  );
  return res.status(201).json({ item: serializeProduct(populated) });
});

router.patch("/reorder", async (req, res) => {
  const { order } = req.body ?? {};
  if (!Array.isArray(order) || !order.length) {
    return res.status(400).json({ message: "order must be a non-empty array" });
  }
  await Promise.all(
    order.map(({ id, sortOrder }) =>
      Product.findByIdAndUpdate(id, { sortOrder }),
    ),
  );
  return res.json({ ok: true });
});

router.patch("/:id/featured", async (req, res) => {
  const { featured } = req.body ?? {};
  if (typeof featured !== "boolean") {
    return res.status(400).json({ message: "featured must be a boolean" });
  }
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { featured },
    { new: true },
  ).populate("category", "name");
  if (!product) return res.status(404).json({ message: "Product not found" });
  return res.json({ product: serializeProduct(product) });
});

router.patch("/:id/visibility", async (req, res) => {
  const { shopVisible } = req.body ?? {};
  if (typeof shopVisible !== "boolean") {
    return res.status(400).json({ message: "shopVisible must be a boolean" });
  }
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { shopVisible },
    { new: true },
  ).populate("category", "name");
  if (!product) return res.status(404).json({ message: "Product not found" });
  return res.json({ product: serializeProduct(product) });
});

router.patch("/:id", async (req, res) => {
  const payload = req.body ?? {};

  if (
    !payload.name ||
    !payload.categoryId ||
    payload.costPrice === undefined ||
    payload.sellingPrice === undefined
  ) {
    return res
      .status(400)
      .json({
        message: "Name, category, cost price, and selling price are required",
      });
  }

  const existing = await Product.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Product not found" });

  const media = buildMedia(payload);

  existing.name = payload.name;
  existing.slug = slugify(payload.name);
  existing.category = payload.categoryId;
  existing.productCollection = payload.collection || "";
  existing.media = media;
  existing.buyingPrice = Number(
    payload.buyingPrice ?? payload.costPrice ?? existing.buyingPrice ?? 0,
  );
  existing.extraCost = Number(payload.extraCost ?? existing.extraCost ?? 0);
  existing.costPrice = Number(payload.costPrice || 0);
  existing.sellingPrice = Number(payload.sellingPrice || 0);
  existing.marketPrice = Number(
    payload.marketPrice ?? payload.sellingPrice ?? existing.marketPrice ?? 0,
  );
  existing.status = payload.status || existing.status;

  const incomingNewVariants = Array.isArray(payload.newVariants)
    ? payload.newVariants
        .map((variant) => ({
          size: String(variant?.size || "").trim(),
          sku: normalizeSku(variant?.sku),
          stock: Number(variant?.stock || 0),
        }))
        .filter((variant) => variant.size)
    : [];

  const existingSizes = new Set(
    existing.variants.map((variant) => normalizeSize(variant.size)),
  );
  const pendingSizes = new Set();
  const existingVariantSkus = new Set(
    existing.variants.map((variant) => normalizeSku(variant.sku)),
  );
  const pendingSkus = new Set();

  for (const variant of incomingNewVariants) {
    const normalizedSize = normalizeSize(variant.size);

    if (existingSizes.has(normalizedSize) || pendingSizes.has(normalizedSize)) {
      return res
        .status(400)
        .json({
          message: `Size ${String(variant.size).toUpperCase()} already exists on this product.`,
        });
    }

    if (!Number.isFinite(variant.stock) || variant.stock < 0) {
      return res
        .status(400)
        .json({ message: "Initial stock must be 0 or greater" });
    }

    if (variant.sku) {
      if (
        existingVariantSkus.has(variant.sku) ||
        pendingSkus.has(variant.sku)
      ) {
        return res.status(400).json({
          message: `SKU already exists: ${variant.sku}. Please use a different SKU.`,
        });
      }
      pendingSkus.add(variant.sku);
    }

    pendingSizes.add(normalizedSize);
  }

  const baseVariantCount = existing.variants.length;

  if (incomingNewVariants.some((v) => !v.sku)) {
    const otherDocs = await Product.find(
      { _id: { $ne: existing._id } },
      "variants.sku",
    ).lean();
    const patchUsedSkus = new Set([
      ...existing.variants.map((v) => normalizeSku(v.sku)).filter(Boolean),
      ...otherDocs.flatMap((p) =>
        p.variants.map((v) => normalizeSku(v.sku)).filter(Boolean),
      ),
    ]);

    for (const [index, variant] of incomingNewVariants.entries()) {
      existing.variants.push({
        size: variant.size,
        sku:
          variant.sku ||
          buildUniqueSku(
            existing.name,
            variant.size,
            baseVariantCount + index,
            patchUsedSkus,
          ),
        stock: variant.stock,
        sold: 0,
      });
    }
  } else {
    const otherDocs = await Product.find(
      { _id: { $ne: existing._id } },
      "variants.sku",
    ).lean();
    const otherSkuSet = new Set(
      otherDocs.flatMap((p) =>
        p.variants.map((v) => normalizeSku(v.sku)).filter(Boolean),
      ),
    );

    for (const variant of incomingNewVariants) {
      if (otherSkuSet.has(variant.sku)) {
        return res.status(400).json({
          message: `SKU already exists: ${variant.sku}. Please use a different SKU.`,
        });
      }
    }

    for (const variant of incomingNewVariants) {
      existing.variants.push({
        size: variant.size,
        sku: variant.sku,
        stock: variant.stock,
        sold: 0,
      });
    }
  }

  await existing.save();

  if (incomingNewVariants.length) {
    const createdVariants = existing.variants.slice(
      -incomingNewVariants.length,
    );
    const logs = createdVariants
      .filter((variant) => variant.stock > 0)
      .map((variant) =>
        createInitialVariantLog(existing, variant, {
          source: "variant_added",
          note: "Initial stock for variant added after product creation",
        }),
      );

    if (logs.length) {
      await InventoryLog.insertMany(logs);
    }
  }

  const item = await Product.findById(existing._id).populate(
    "category",
    "name",
  );
  return res.json({ item: serializeProduct(item) });
});

router.patch("/:id/media/reorder", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const updates = Array.isArray(req.body.media) ? req.body.media : [];

  for (const update of updates) {
    if (!update._id) continue;
    const subdoc = product.media.find(
      (m) => m._id.toString() === String(update._id),
    );
    if (!subdoc) continue;
    if (update.sortOrder !== undefined) subdoc.sortOrder = update.sortOrder;
    if (update.tag !== undefined) subdoc.tag = update.tag;
    if (update.isPrimary !== undefined) subdoc.isPrimary = !!update.isPrimary;
  }

  // Enforce single primary
  const primaries = product.media.filter((m) => m.isPrimary);
  if (primaries.length > 1) {
    const sorted = primaries.sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    for (const m of sorted.slice(1)) m.isPrimary = false;
  } else if (primaries.length === 0 && product.media.length > 0) {
    const sorted = product.media
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    sorted[0].isPrimary = true;
  }

  await product.save();
  const populated = await Product.findById(product._id).populate(
    "category",
    "name",
  );
  return res.json({ product: serializeProduct(populated) });
});

router.delete("/:id", async (req, res) => {
  const item = await Product.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Product not found" });
  return res.json({ ok: true });
});

export default router;
