import { Router } from "express";

import { Expense } from "../models/Expense.js";

const router = Router();

router.get("/", async (_req, res) => {
  const items = await Expense.find().sort({ incurredAt: -1 }).lean();
  return res.json({ items });
});

router.post("/", async (req, res) => {
  const { title, category, amount, note = "", incurredAt } = req.body ?? {};

  if (!title || !category || amount === undefined) {
    return res.status(400).json({ message: "Title, category, and amount are required" });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount < 0) {
    return res.status(400).json({ message: "Amount must be a non-negative number" });
  }

  const expense = await Expense.create({
    title,
    category,
    amount: numAmount,
    note,
    incurredAt: incurredAt ? new Date(incurredAt) : new Date(),
  });

  return res.status(201).json({ item: expense });
});

router.delete("/:id", async (req, res) => {
  const item = await Expense.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Expense not found" });
  return res.json({ ok: true });
});

export default router;
