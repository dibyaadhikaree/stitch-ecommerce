import { Router } from "express";
import { PromoCode } from "../models/PromoCode.js";

const router = Router();

export function computeDiscount(type, value, orderTotal) {
  if (type === "percent") {
    return Math.round(orderTotal * value / 100);
  }
  return Math.min(value, orderTotal);
}

export async function resolvePromoCode(code, orderTotal) {
  const promo = await PromoCode.findOne({ code: code.toUpperCase().trim() });

  if (!promo) {
    const err = new Error("Invalid promo code");
    err.status = 404;
    throw err;
  }
  if (!promo.isActive) {
    const err = new Error("This code is no longer active");
    err.status = 400;
    throw err;
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    const err = new Error("Code has expired");
    err.status = 400;
    throw err;
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    const err = new Error("Code limit reached");
    err.status = 400;
    throw err;
  }
  if (orderTotal < promo.minOrderValue) {
    const err = new Error(`Minimum order NPR ${promo.minOrderValue} required`);
    err.status = 400;
    throw err;
  }

  return promo;
}

// Public handler — also used directly in index.js before requireAuth
export async function handleValidatePromo(req, res) {
  const { code, orderTotal } = req.body ?? {};

  if (!code || orderTotal === undefined || orderTotal === null) {
    return res.status(400).json({ message: "code and orderTotal are required" });
  }

  const total = Number(orderTotal);
  if (isNaN(total) || total < 0) {
    return res.status(400).json({ message: "orderTotal must be a non-negative number" });
  }

  const promo = await resolvePromoCode(code, total);
  const discount = computeDiscount(promo.type, promo.value, total);

  return res.json({
    valid: true,
    type: promo.type,
    value: promo.value,
    discount,
    finalTotal: total - discount,
  });
}

// Protected: list all promo codes
router.get("/", async (_req, res) => {
  const items = await PromoCode.find().sort({ createdAt: -1 }).lean();
  return res.json({ items });
});

// Protected: create a promo code
router.post("/", async (req, res) => {
  const { code, type, value, minOrderValue, maxUses, expiresAt } = req.body ?? {};

  const promo = await PromoCode.create({
    code: String(code || "").toUpperCase().trim(),
    type,
    value,
    minOrderValue: minOrderValue ?? 0,
    maxUses: maxUses ?? null,
    expiresAt: expiresAt ?? null,
  });

  return res.status(201).json({ item: promo });
});

// Protected: toggle isActive
router.patch("/:id", async (req, res) => {
  const { isActive } = req.body ?? {};

  const promo = await PromoCode.findByIdAndUpdate(
    req.params.id,
    { isActive: Boolean(isActive) },
    { new: true },
  );

  if (!promo) {
    return res.status(404).json({ message: "Promo code not found" });
  }

  return res.json({ item: promo });
});

// Protected: delete a promo code
router.delete("/:id", async (req, res) => {
  const promo = await PromoCode.findByIdAndDelete(req.params.id);

  if (!promo) {
    return res.status(404).json({ message: "Promo code not found" });
  }

  return res.json({ ok: true });
});

export default router;
