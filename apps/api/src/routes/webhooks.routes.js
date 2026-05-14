import crypto from "crypto";
import { Router } from "express";

import { WEBHOOK_SECRET } from "../config/env.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
import {
  createOrder,
  formatOrderForResponse,
} from "../services/order.service.js";

const router = Router();

// POST /orders — receives website order webhooks
router.post("/orders", async (req, res) => {
  const signature = req.headers["x-stitch-signature"];
  const idempotencyKey = req.headers["x-idempotency-key"];

  // Verify HMAC-SHA256 signature
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (!signature || signature !== expectedSignature) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }

  // Idempotency: return 200 if already processed
  if (idempotencyKey) {
    const existing = await WebhookEvent.findOne({ idempotencyKey }).lean();
    if (existing) {
      return res
        .status(200)
        .json({ message: "Already received", status: existing.status });
    }
  }

  const event = await WebhookEvent.create({
    idempotencyKey: idempotencyKey || `auto-${Date.now()}`,
    payload: req.body,
    status: "received",
  });

  try {
    const order = await createOrder({
      customerName: req.body.customerName,
      phone: req.body.phone || req.body.customerPhone,
      address: req.body.address || req.body.customerAddress,
      channel: req.body.channel || "website",
      source: "website",
      paymentStatus: req.body.paymentStatus,
      note: req.body.note || req.body.notes,
      items: req.body.items,
    });

    event.status = "processed";
    await event.save();

    return res.status(201).json({
      message: "Processed",
      item: formatOrderForResponse(order.toObject()),
    });
  } catch (error) {
    event.status = "failed";
    await event.save();
    throw error;
  }
});

export default router;
