import { Router } from "express";

import { Order } from "../models/Order.js";
import {
  createOrder,
  deleteOrder,
  formatOrderForResponse,
  registerOrderReturn,
  transitionOrderStatus,
  updateOrderDetails,
} from "../services/order.service.js";

const router = Router();

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  const {
    orderStatus = "",
    channel = "",
    paymentStatus = "",
    from = "",
    to = "",
    search = "",
    page = "1",
    limit = "20",
  } = req.query;

  const filters = {};

  if (orderStatus) filters.orderStatus = orderStatus;
  if (channel) filters.channel = channel;

  if (paymentStatus === "cod") {
    filters.paymentStatus = "cod";
  } else if (paymentStatus === "paid") {
    filters.paymentStatus = { $in: ["cash", "bank_transfer", "esewa", "khalti"] };
  } else if (paymentStatus) {
    filters.paymentStatus = paymentStatus;
  }

  if (from || to) {
    filters.createdAt = {};
    if (from) filters.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filters.createdAt.$lte = toDate;
    }
  }

  if (search) {
    const safe = escapeRegExp(String(search));
    filters.$or = [
      { customerName: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } },
      { customerPhone: { $regex: safe, $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Order.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Order.countDocuments(filters),
  ]);

  return res.json({
    items: items.map(formatOrderForResponse),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  });
});

router.post("/", async (req, res) => {
  const item = await createOrder(req.body ?? {});
  return res.status(201).json({ item: formatOrderForResponse(item.toObject()) });
});

router.patch("/:id/status", async (req, res) => {
  const item = await transitionOrderStatus(req.params.id, req.body ?? {});
  return res.json({ item: formatOrderForResponse(item.toObject()) });
});

router.post("/:id/return", async (req, res) => {
  const item = await registerOrderReturn(req.params.id, req.body ?? {});
  return res.json({ item: formatOrderForResponse(item.toObject()) });
});

router.patch("/:id", async (req, res) => {
  const payload = req.body ?? {};

  let item;
  if (payload.status || payload.orderStatus) {
    item = await transitionOrderStatus(req.params.id, payload);
  } else {
    item = await updateOrderDetails(req.params.id, payload);
  }

  return res.json({ item: formatOrderForResponse(item.toObject()) });
});

router.delete("/:id", async (req, res) => {
  await deleteOrder(req.params.id);
  return res.json({ ok: true });
});

export default router;
