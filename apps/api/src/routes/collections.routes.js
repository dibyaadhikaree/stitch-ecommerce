import { Router } from "express";

import { Collection } from "../models/Collection.js";
import { Product } from "../models/Product.js";

const router = Router();

// PATCH /reorder must be defined before /:id to avoid Express route shadowing
router.patch("/reorder", async (req, res) => {
  const { order } = req.body ?? {};
  if (!Array.isArray(order) || !order.length) {
    return res.status(400).json({ message: "order must be a non-empty array" });
  }
  await Promise.all(
    order.map(({ id, sortOrder }) =>
      Collection.findByIdAndUpdate(id, { sortOrder }),
    ),
  );
  return res.json({ ok: true });
});

router.get("/", async (_req, res) => {
  const items = await Collection.find().sort({ sortOrder: 1 }).lean();
  return res.json({ items });
});

router.post("/", async (req, res) => {
  const { name, description = "", coverImage = "" } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ message: "Collection name is required" });
  }
  const collection = new Collection({ name, description, coverImage });
  await collection.save();
  return res.status(201).json({ item: collection });
});

router.patch("/:id/products", async (req, res) => {
  const { productIds } = req.body ?? {};

  if (!Array.isArray(productIds)) {
    return res.status(400).json({ message: "productIds must be an array" });
  }

  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    return res.status(404).json({ message: "Collection not found" });
  }

  await Product.updateMany(
    { productCollection: collection.name, _id: { $nin: productIds } },
    { $set: { productCollection: "" } },
  );

  await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: { productCollection: collection.name } },
  );

  return res.json({ success: true });
});

router.patch("/:id", async (req, res) => {
  const { name, description, coverImage, isActive } = req.body ?? {};
  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    return res.status(404).json({ message: "Collection not found" });
  }
  if (name !== undefined) collection.name = name;
  if (description !== undefined) collection.description = description;
  if (coverImage !== undefined) collection.coverImage = coverImage;
  if (isActive !== undefined) collection.isActive = isActive;
  await collection.save();
  return res.json({ item: collection });
});

router.delete("/:id", async (req, res) => {
  const item = await Collection.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Collection not found" });
  return res.json({ ok: true });
});

export default router;
