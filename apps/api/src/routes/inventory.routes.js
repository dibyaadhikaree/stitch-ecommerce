import { Router } from "express";

import { InventoryLog } from "../models/InventoryLog.js";
import { Product } from "../models/Product.js";

const router = Router();

const VALID_MOVEMENT_TYPES = new Set(["stock_in", "sale", "return", "damage", "adjustment"]);

function createLogPayload(product, variant, overrides = {}) {
  return {
    product: product._id,
    productName: product.name,
    variantId: variant._id,
    variantLabel: `${product.name} / ${variant.size}`,
    sku: variant.sku,
    size: variant.size,
    loggedBy: "Admin",
    ...overrides,
  };
}

function serializeLog(log, productMediaById = new Map()) {
  const rawProductId = log.product?._id || log.product;
  const productId = rawProductId ? String(rawProductId) : "";
  const media = productMediaById.get(productId) || [];

  return {
    ...log,
    product: productId,
    media,
    image:
      media.find((item) => item.isPrimary && item.type === "image")?.url ||
      media.find((item) => item.type === "image")?.url ||
      "",
  };
}

router.get("/", async (req, res) => {
  const { productId = "", from = "", to = "", type = "" } = req.query;
  const filters = {};

  if (productId) {
    filters.product = productId;
  }

  if (type) {
    filters.type = type;
  }

  if (from || to) {
    filters.createdAt = {};

    if (from) {
      filters.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    }

    if (to) {
      filters.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }
  }

  const items = await InventoryLog.find(filters).sort({ createdAt: -1 }).lean();
  const productIds = [...new Set(items.map((item) => String(item.product)).filter(Boolean))];
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select("media").lean()
    : [];

  const productMediaById = new Map(
    products.map((product) => {
      const media = (product.media || []).map((item) => ({
        url: item.url,
        type: item.type,
        isPrimary: item.isPrimary,
      }));
      return [String(product._id), media];
    }),
  );

  return res.json({ items: items.map((item) => serializeLog(item, productMediaById)) });
});

router.post("/adjust", async (req, res) => {
  const { productId, variantId, type, quantity, note = "" } = req.body ?? {};

  if (!productId || !variantId || !type || !quantity) {
    return res.status(400).json({ message: "Product, variant, type, and quantity are required" });
  }

  if (!VALID_MOVEMENT_TYPES.has(type)) {
    return res.status(400).json({ message: `Invalid movement type. Must be one of: ${[...VALID_MOVEMENT_TYPES].join(", ")}` });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const variant = product.variants.id(variantId);
  if (!variant) {
    return res.status(404).json({ message: "Variant not found" });
  }

  const qty = Number(quantity);
  const direction =
    type === "stock_in" || type === "return"
      ? 1
      : type === "sale" || type === "damage"
        ? -1
        : 0;

  if (direction === 0) {
    variant.stock = Math.max(0, variant.stock + qty);
  } else {
    variant.stock = Math.max(0, variant.stock + direction * Math.abs(qty));
  }

  await product.save();

  const log = await InventoryLog.create(createLogPayload(product, variant, {
    type,
    quantity: direction === 0 ? qty : direction * Math.abs(qty),
    note,
  }));

  return res.status(201).json({ item: log });
});

router.post("/adjust-stock", async (req, res) => {
  const { productId, variantId, stock, note = "" } = req.body ?? {};

  if (!productId || !variantId || stock === undefined || stock === null) {
    return res.status(400).json({ message: "Product, variant, and corrected stock are required" });
  }

  const nextStock = Number(stock);

  if (!Number.isFinite(nextStock) || nextStock < 0) {
    return res.status(400).json({ message: "Corrected stock must be a valid number above or equal to 0" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const variant = product.variants.id(variantId);
  if (!variant) {
    return res.status(404).json({ message: "Variant not found" });
  }

  const previousStock = Number(variant.stock || 0);
  const delta = nextStock - previousStock;

  variant.stock = nextStock;
  await product.save();

  const log = await InventoryLog.create(createLogPayload(product, variant, {
    source: "stock_correction",
    type: "adjustment",
    quantity: delta,
    note: note || `Stock corrected from ${previousStock} to ${nextStock}`,
  }));

  return res.status(201).json({ item: log });
});

router.post("/stock-in", async (req, res) => {
  const { productId, entries = [] } = req.body ?? {};

  if (!productId || !Array.isArray(entries) || !entries.length) {
    return res
      .status(400)
      .json({ message: "Product and at least one stock-in entry are required" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const normalizedEntries = entries
    .map((entry) => ({
      variantId: entry.variantId,
      quantity: Number(entry.quantity || 0),
    }))
    .filter((entry) => entry.variantId && entry.quantity > 0);

  if (!normalizedEntries.length) {
    return res.status(400).json({ message: "At least one quantity above 0 is required" });
  }

  const createdLogs = [];

  for (const entry of normalizedEntries) {
    const variant = product.variants.id(entry.variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    variant.stock += entry.quantity;

    createdLogs.push(createLogPayload(product, variant, {
      source: "manual_stock_in",
      type: "stock_in",
      quantity: entry.quantity,
      note: "Stock-in from inventory panel",
    }));
  }

  await product.save();

  const items = await InventoryLog.insertMany(createdLogs);
  return res.status(201).json({ items });
});

export default router;
