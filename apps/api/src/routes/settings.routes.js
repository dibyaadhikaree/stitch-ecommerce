import { Router } from "express";

import { Setting } from "../models/Setting.js";

const router = Router();

const DEFAULT_PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "cod",
  "esewa",
  "khalti",
];

function normalizeSettings(item = {}) {
  return {
    shopName: item.shopName || "STITCH Studio",
    currency: "NPR",
    lowStockThreshold: Math.max(0, Number(item.lowStockThreshold ?? 5)),
    acceptedPaymentMethods: Array.isArray(item.acceptedPaymentMethods)
      ? item.acceptedPaymentMethods.filter((method) =>
          DEFAULT_PAYMENT_METHODS.includes(method),
        )
      : DEFAULT_PAYMENT_METHODS,
    aboutHeadline: item.aboutHeadline ?? "",
    aboutBody: item.aboutBody ?? "",
    aboutImageUrl: item.aboutImageUrl ?? "",
    instagramHandle: item.instagramHandle ?? "",
    tiktokHandle: item.tiktokHandle ?? "",
    whatsappNumber: item.whatsappNumber ?? "",
    seoTitle: item.seoTitle ?? "STITCH",
    seoDescription: item.seoDescription ?? "Premium minimal fashion.",
    footerTagline: item.footerTagline ?? "",
    shippingNote: item.shippingNote ?? "",
    returnPolicy: item.returnPolicy ?? "",
    sizeGuide: item.sizeGuide ?? {},
    ...(item._id ? { _id: item._id } : {}),
  };
}

router.get("/", async (_req, res) => {
  const item = await Setting.findOne().lean();

  return res.json({
    item: normalizeSettings(item ?? {}),
  });
});

router.patch("/", async (req, res) => {
  const { _id, __v, ...payload } = req.body ?? {};

  const normalizedPayload = normalizeSettings(payload);

  const item = await Setting.findOneAndUpdate({}, normalizedPayload, {
    new: true,
    upsert: true,
  }).lean();

  return res.json({ item: normalizeSettings(item ?? {}) });
});

export default router;
