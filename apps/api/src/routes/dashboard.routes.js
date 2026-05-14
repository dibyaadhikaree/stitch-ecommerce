import { Router } from "express";

import { Customer } from "../models/Customer.js";
import { Expense } from "../models/Expense.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import {
  formatOrderForResponse,
  getOrderLifecycleDate,
  normalizeOrderStatus,
} from "../services/order.service.js";

const router = Router();

function startOfWeek(date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + diff);
  return value;
}

function formatWeekLabel(date) {
  const month = date.toLocaleString("en-US", { month: "short" });
  const weekOfMonth = Math.floor((date.getDate() - 1) / 7) + 1;
  return `${month} W${weekOfMonth}`;
}

router.get("/", async (_req, res) => {
  const [rawOrders, expenses, products, settings, totalCustomers] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).lean(),
    Expense.find().sort({ incurredAt: -1 }).lean(),
    Product.find().lean(),
    Setting.findOne().lean(),
    Customer.countDocuments(),
  ]);

  const orders = rawOrders.map(formatOrderForResponse);
  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const lowStockThreshold = settings?.lowStockThreshold ?? 3;

  const deliveredOrders = orders.filter(
    (order) => order.orderStatus === "Delivered" && !order.hasReturn,
  );
  const shippedOrders = orders.filter((order) => order.orderStatus === "Shipped");
  const pendingOrders = orders.filter((order) => order.orderStatus === "Pending");
  const confirmedOrders = orders.filter((order) => order.orderStatus === "Confirmed");
  const returnedOrders = orders.filter((order) => order.hasReturn);

  const codOutstanding = orders
    .filter(
      (order) =>
        order.paymentMethod === "cod" &&
        ["Pending", "Confirmed", "Shipped"].includes(order.orderStatus),
    )
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const grossRevenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = grossRevenue - totalExpenses;
  const totalOrders = orders.length;
  const ordersThisWeek = orders.filter(
    (order) => new Date(order.createdAt) >= currentWeekStart,
  ).length;

  const lowStockProducts = products.flatMap((product) =>
    product.variants
      .filter((variant) => {
        const threshold = variant.lowStockThreshold ?? lowStockThreshold;
        return variant.stock <= threshold;
      })
      .map((variant) => ({
        productId: String(product._id),
        productName: product.name,
        size: variant.size,
        stock: variant.stock,
      })),
  );

  const topProductsMap = new Map();
  for (const order of deliveredOrders) {
    for (const item of order.items) {
      const current = topProductsMap.get(item.productName) ?? {
        name: item.productName,
        totalSold: 0,
        revenue: 0,
      };

      current.totalSold += item.quantity;
      current.revenue += item.lineTotal;
      topProductsMap.set(item.productName, current);
    }
  }

  const topProducts = Array.from(topProductsMap.values())
    .sort((a, b) => {
      if (b.totalSold !== a.totalSold) return b.totalSold - a.totalSold;
      return b.revenue - a.revenue;
    })
    .slice(0, 5);

  const revenueByWeekMap = new Map();
  for (let offset = 7; offset >= 0; offset -= 1) {
    const weekStartDate = new Date(currentWeekStart);
    weekStartDate.setDate(currentWeekStart.getDate() - offset * 7);
    const key = weekStartDate.toISOString();
    revenueByWeekMap.set(key, {
      week: formatWeekLabel(weekStartDate),
      revenue: 0,
      profit: 0,
      expense: 0,
    });
  }

  for (const order of deliveredOrders) {
    const deliveredAt = getOrderLifecycleDate(order, "Delivered") ?? new Date(order.updatedAt || order.createdAt);
    const weekStartDate = startOfWeek(deliveredAt);
    const key = weekStartDate.toISOString();
    const current = revenueByWeekMap.get(key);
    if (current) current.revenue += order.totalAmount;
  }

  for (const expense of expenses) {
    const weekStartDate = startOfWeek(new Date(expense.incurredAt));
    const key = weekStartDate.toISOString();
    const current = revenueByWeekMap.get(key);
    if (current) current.expense += expense.amount;
  }

  const revenueByWeek = Array.from(revenueByWeekMap.values()).map((entry) => ({
    week: entry.week,
    revenue: entry.revenue,
    profit: entry.revenue - entry.expense,
  }));

  const channelBreakdownMap = new Map();
  for (const order of deliveredOrders) {
    const channel = order.channel || "manual";
    const current = channelBreakdownMap.get(channel) ?? { channel, orderCount: 0, revenue: 0 };
    current.orderCount += 1;
    current.revenue += order.totalAmount;
    channelBreakdownMap.set(channel, current);
  }

  const channelBreakdown = Array.from(channelBreakdownMap.values()).sort(
    (a, b) => b.revenue - a.revenue,
  );

  const deliveredCount = deliveredOrders.length;
  const returnRate =
    deliveredCount > 0 ? Math.round((returnedOrders.length / deliveredCount) * 1000) / 10 : 0;
  const orderCountByCustomer = new Map();
  for (const order of orders) {
    if (!order.customer || normalizeOrderStatus(order.orderStatus) === "Cancelled") continue;
    const key = String(order.customer);
    orderCountByCustomer.set(key, (orderCountByCustomer.get(key) ?? 0) + 1);
  }

  const repeatCustomers = [...orderCountByCustomer.values()].filter((count) => count > 1).length;
  const repeatCustomerRate =
    totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10 : 0;

  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(currentWeekStart.getDate() - 7);

  const currentWeekOrders = deliveredOrders.filter((order) => {
    const deliveredAt = getOrderLifecycleDate(order, "Delivered") ?? new Date(order.createdAt);
    return deliveredAt >= currentWeekStart;
  });

  const lastWeekOrders = deliveredOrders.filter((order) => {
    const deliveredAt = getOrderLifecycleDate(order, "Delivered") ?? new Date(order.createdAt);
    return deliveredAt >= lastWeekStart && deliveredAt < currentWeekStart;
  });

  const avgOrderValue = {
    currentWeek:
      currentWeekOrders.length > 0
        ? Math.round(
            currentWeekOrders.reduce((sum, order) => sum + order.totalAmount, 0) /
              currentWeekOrders.length,
          )
        : 0,
    lastWeek:
      lastWeekOrders.length > 0
        ? Math.round(
            lastWeekOrders.reduce((sum, order) => sum + order.totalAmount, 0) /
              lastWeekOrders.length,
          )
        : 0,
  };

  return res.json({
    grossRevenue,
    totalExpenses,
    netProfit,
    totalOrders,
    ordersThisWeek,
    activeOrders: pendingOrders.length + confirmedOrders.length + shippedOrders.length,
    codOutstanding,
    shippedOrders: shippedOrders.length,
    deliveredOrders: deliveredCount,
    returnedOrders: returnedOrders.length,
    topProducts,
    lowStockProducts,
    revenueByWeek,
    recentOrders: orders.slice(0, 5).map((order) => ({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: order.totalAmount,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
    })),
    channelBreakdown,
    returnRate,
    repeatCustomerRate,
    avgOrderValue,
  });
});

export default router;
