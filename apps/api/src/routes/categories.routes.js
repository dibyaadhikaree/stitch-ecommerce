import { Router } from "express";

import { Category } from "../models/Category.js";
import { slugify } from "../lib/slugify.js";

const router = Router();

router.get("/", async (_req, res) => {
  const items = await Category.find().sort({ name: 1 }).lean();
  return res.json({ items });
});

router.post("/", async (req, res) => {
  const { name, description = "" } = req.body ?? {};

  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  const category = await Category.create({
    name,
    slug: slugify(name),
    description,
  });

  return res.status(201).json({ item: category });
});

router.delete("/:id", async (req, res) => {
  const item = await Category.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Category not found" });
  return res.json({ ok: true });
});

export default router;
