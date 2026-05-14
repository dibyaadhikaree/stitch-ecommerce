import { Router } from "express";

import { Customer } from "../models/Customer.js";
import { Order } from "../models/Order.js";
import { formatOrderForResponse } from "../services/order.service.js";

const router = Router();

function buildCustomerMetricsMap(orders) {
  const totals = new Map();

  for (const order of orders) {
    if (!order.customer) continue;

    const key = String(order.customer);
    const current = totals.get(key) ?? { totalOrders: 0, totalSpent: 0 };
    const hasReturn = Boolean(order.hasReturn || order.returnInfo?.returnedAt);

    current.totalOrders += 1;
    current.totalSpent += hasReturn ? 0 : order.totalAmount;
    totals.set(key, current);
  }

  return totals;
}

router.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const phoneFilter = req.query.phone ? String(req.query.phone).trim() : "";
  const filter = phoneFilter ? { phone: { $regex: phoneFilter, $options: "i" } } : {};

  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filter),
  ]);

  const customerIds = items.map((item) => item._id);
  const relatedOrders = customerIds.length
    ? await Order.find({
        customer: { $in: customerIds },
        orderStatus: { $ne: "Cancelled" },
      })
        .select("customer totalAmount hasReturn returnInfo")
        .lean()
    : [];

  const metrics = buildCustomerMetricsMap(relatedOrders);

  const normalizedItems = items
    .map((item) => ({
      ...item,
      totalOrders: metrics.get(String(item._id))?.totalOrders ?? 0,
      totalSpent: metrics.get(String(item._id))?.totalSpent ?? 0,
    }))
    .sort((a, b) => {
      if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return res.json({ items: normalizedItems, total, page, limit });
});

router.get("/:id", async (req, res) => {
  const customer = await Customer.findById(req.params.id).lean();
  if (!customer) return res.status(404).json({ message: "Customer not found" });

  const orders = await Order.find({ customer: customer._id }).sort({ createdAt: -1 }).lean();
  const activeOrders = orders.filter((order) => order.orderStatus !== "Cancelled");
  const totalSpent = activeOrders.reduce((sum, order) => {
    const hasReturn = Boolean(order.hasReturn || order.returnInfo?.returnedAt);
    return sum + (hasReturn ? 0 : order.totalAmount);
  }, 0);

  return res.json({
    item: {
      ...customer,
      totalOrders: activeOrders.length,
      totalSpent,
    },
    orders: orders.map(formatOrderForResponse),
  });
});

router.post("/", async (req, res) => {
  const { name, phone, address = "", channel = "manual", notes = "" } = req.body ?? {};

  if (!name || !phone) {
    return res.status(400).json({ message: "Name and phone are required" });
  }

  const existing = await Customer.findOne({ phone: String(phone).trim() });
  if (existing) {
    return res.json({ item: existing });
  }

  const customer = await Customer.create({ name, phone, address, channel, notes });
  return res.status(201).json({ item: customer });
});

router.patch("/:id", async (req, res) => {
  const { name, address, notes } = req.body ?? {};

  const item = await Customer.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Customer not found" });

  if (name !== undefined) item.name = name;
  if (address !== undefined) item.address = address;
  if (notes !== undefined) item.notes = notes;

  await item.save();
  return res.json({ item });
});

router.delete("/:id", async (req, res) => {
  const item = await Customer.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Customer not found" });

  const orderCount = await Order.countDocuments({ customer: item._id, orderStatus: { $ne: "Cancelled" } });
  if (orderCount > 0) {
    return res.status(400).json({ message: "Cannot delete a customer with existing orders" });
  }

  await item.deleteOne();
  return res.json({ ok: true });
});

export default router;
