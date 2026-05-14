import { Customer } from "../models/Customer.js";
import { InventoryLog } from "../models/InventoryLog.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";
import { sendNewOrderEmail } from "../lib/mailer.js";

const DEFAULT_PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "cod",
  "esewa",
  "khalti",
];

export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function normalizePaymentStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized || normalized === "pending") return "unpaid";
  if (normalized === "paid") return "cash";
  if (normalized === "bank transfer") return "bank_transfer";
  if (normalized === "cod") return "cod";
  if (normalized === "cash") return "cash";
  if (normalized === "esewa") return "esewa";
  if (normalized === "khalti") return "khalti";

  return "unpaid";
}

export function normalizeChannel(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "website") return "website";
  if (normalized === "instagram") return "instagram";
  if (normalized === "facebook") return "facebook";
  return "manual";
}

export function normalizeOrderStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized || normalized === "pending") return "Pending";
  if (normalized === "confirmed") return "Confirmed";
  if (
    normalized === "processing" ||
    normalized === "packed" ||
    normalized === "shipped"
  )
    return "Shipped";
  if (normalized === "delivered") return "Delivered";
  if (normalized === "cancelled" || normalized === "canceled")
    return "Cancelled";

  return "Pending";
}

function cleanText(value) {
  return String(value || "").trim();
}

function getStatusChangeNote(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return "";
  if (nextStatus === "Confirmed") return "Order confirmed and stock committed";
  if (nextStatus === "Shipped") return "Order shipped";
  if (nextStatus === "Delivered") return "Order delivered";
  if (nextStatus === "Cancelled") return "Order cancelled";
  return `Status changed to ${nextStatus}`;
}

function getLifecycleDate(order, status) {
  const event = (order.lifecycleEvents || []).find(
    (entry) => entry.status === status,
  );
  return event?.changedAt ? new Date(event.changedAt) : null;
}

export function formatOrderForResponse(order) {
  if (!order) return order;

  const normalizedStatus = normalizeOrderStatus(order.orderStatus);
  const normalizedPaymentStatus = normalizePaymentStatus(order.paymentStatus);
  const hasReturn = Boolean(order.hasReturn || order.returnInfo?.returnedAt);
  const lifecycleEvents = Array.isArray(order.lifecycleEvents)
    ? order.lifecycleEvents.map((event) => ({
        ...event,
        status:
          ORDER_STATUSES.includes(event.status) || event.status === "Returned"
            ? event.status
            : normalizeOrderStatus(event.status),
      }))
    : [];

  return {
    ...order,
    orderStatus: normalizedStatus,
    paymentStatus: normalizedPaymentStatus,
    codCollected:
      normalizedStatus === "Delivered" && normalizedPaymentStatus === "cod"
        ? true
        : Boolean(order.codCollected),
    hasReturn,
    returnInfo: order.returnInfo ?? null,
    stockApplied: Boolean(order.stockApplied),
    lifecycleEvents,
    phone: order.phone || order.customerPhone || "",
    customerPhone: order.customerPhone || order.phone || "",
    address: order.address || order.customerAddress || "",
    customerAddress: order.customerAddress || order.address || "",
  };
}

async function allocateOrderNumber() {
  await Setting.updateOne(
    {},
    {
      $setOnInsert: {
        shopName: "STITCH Studio",
        currency: "NPR",
        lowStockThreshold: 5,
        acceptedPaymentMethods: DEFAULT_PAYMENT_METHODS,
        orderSequence: 3000,
      },
    },
    {
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  const settings = await Setting.findOneAndUpdate(
    {},
    { $inc: { orderSequence: 1 } },
    { new: true },
  );

  return `ORD-${settings.orderSequence}`;
}

async function normalizeOrderItems(items, { enforceStock = false } = {}) {
  if (!Array.isArray(items) || !items.length) {
    throw createHttpError(400, "At least one order item is required");
  }

  const normalizedItems = [];
  let totalAmount = 0;

  for (const rawItem of items) {
    const productId = rawItem.productId || rawItem.product;
    const variantId = rawItem.variantId;
    const quantity = Number(rawItem.quantity);

    if (
      !productId ||
      !variantId ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw createHttpError(
        400,
        "Each order item needs a product, variant, and quantity",
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw createHttpError(404, "A selected product was not found");
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      throw createHttpError(404, "A selected variant was not found");
    }

    if (enforceStock && variant.stock < quantity) {
      throw createHttpError(
        400,
        `Insufficient stock for ${product.name} ${variant.size}`,
      );
    }

    const lineTotal = quantity * product.sellingPrice;
    totalAmount += lineTotal;

    normalizedItems.push({
      product: product._id,
      productName: product.name,
      variantId: variant._id,
      sku: variant.sku,
      size: variant.size,
      quantity,
      price: product.sellingPrice,
      lineTotal,
    });
  }

  return { items: normalizedItems, totalAmount };
}

async function adjustOrderStock(order, direction, note) {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw createHttpError(404, `${item.productName} is no longer available`);
    }

    const variant = product.variants.id(item.variantId);
    if (!variant) {
      throw createHttpError(
        404,
        `${item.productName} / ${item.size} is no longer available`,
      );
    }

    if (direction === "deduct") {
      if (variant.stock < item.quantity) {
        throw createHttpError(
          400,
          `Insufficient stock for ${item.productName} ${item.size}. Available: ${variant.stock}`,
        );
      }

      variant.stock -= item.quantity;
      variant.sold += item.quantity;
    } else {
      variant.stock += item.quantity;
      variant.sold = Math.max(0, variant.sold - item.quantity);
    }

    await product.save();

    await InventoryLog.create({
      product: product._id,
      productName: product.name,
      variantId: variant._id,
      variantLabel: `${product.name} / ${variant.size}`,
      sku: variant.sku,
      size: variant.size,
      type: direction === "deduct" ? "sale" : "return",
      quantity: direction === "deduct" ? -item.quantity : item.quantity,
      note,
    });
  }
}

async function findOrCreateCustomer({ name, phone, address, channel }) {
  const cleanPhone = cleanText(phone);
  if (!cleanPhone) return null;

  let customer = await Customer.findOne({ phone: cleanPhone });

  if (!customer) {
    customer = await Customer.create({
      name: cleanText(name) || "Customer",
      phone: cleanPhone,
      address: cleanText(address),
      channel: normalizeChannel(channel),
    });

    return customer;
  }

  const nextName = cleanText(name);
  const nextAddress = cleanText(address);
  const nextChannel = normalizeChannel(channel);

  if (nextName && nextName !== customer.name) customer.name = nextName;
  if (nextAddress && nextAddress !== customer.address)
    customer.address = nextAddress;
  if (nextChannel && nextChannel !== customer.channel)
    customer.channel = nextChannel;

  await customer.save();
  return customer;
}

export async function syncCustomerStats(customerId) {
  if (!customerId) return null;

  const orders = await Order.find({
    customer: customerId,
    orderStatus: { $ne: "Cancelled" },
  }).lean();

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => {
    const hasReturn = Boolean(order.hasReturn || order.returnInfo?.returnedAt);
    return sum + (hasReturn ? 0 : order.totalAmount);
  }, 0);

  await Customer.findByIdAndUpdate(customerId, { totalOrders, totalSpent });

  return { totalOrders, totalSpent };
}

export async function syncCustomerStatsForOrderCustomerSwap(
  previousCustomerId,
  nextCustomerId,
) {
  if (
    previousCustomerId &&
    String(previousCustomerId) !== String(nextCustomerId || "")
  ) {
    await syncCustomerStats(previousCustomerId);
  }

  if (nextCustomerId) {
    await syncCustomerStats(nextCustomerId);
  }
}

export async function createOrder(payload) {
  const customerName = cleanText(payload.customerName);
  const phone = cleanText(payload.phone || payload.customerPhone);
  const address = cleanText(payload.address || payload.customerAddress);
  const channel = normalizeChannel(payload.channel || payload.source);
  const note = cleanText(payload.note || payload.notes);

  if (!customerName || !phone) {
    throw createHttpError(400, "Customer name and phone are required");
  }

  const { items, totalAmount } = await normalizeOrderItems(payload.items);
  const customer = await findOrCreateCustomer({
    name: customerName,
    phone,
    address,
    channel,
  });

  const appliedPromo = payload.appliedPromo ?? null;
  const discountAmount = appliedPromo?.discount ?? 0;
  const finalTotal = totalAmount - discountAmount;

  const order = await Order.create({
    orderNumber: await allocateOrderNumber(),
    customer: customer?._id ?? null,
    customerName,
    phone,
    customerPhone: phone,
    address,
    customerAddress: address,
    channel,
    paymentStatus: normalizePaymentStatus(payload.paymentStatus),
    orderStatus: "Pending",
    note,
    notes: note,
    items,
    totalAmount,
    discountAmount,
    finalTotal,
    appliedPromo,
    stockApplied: false,
    codCollected: false,
    lifecycleEvents: [{ status: "Pending", note: "Order created" }],
  });

  if (customer?._id) {
    await syncCustomerStats(customer._id);
  }

  sendNewOrderEmail(order).catch((err) =>
    console.error("Order email failed:", err.message),
  );

  return order;
}

export async function updateOrderDetails(orderId, payload) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  order.orderStatus = normalizeOrderStatus(order.orderStatus);

  if (order.orderStatus === "Delivered" || order.orderStatus === "Cancelled") {
    throw createHttpError(400, "Delivered and cancelled orders are read-only");
  }

  // Confirmed orders: only allow payment status and tracking edits
  if (order.orderStatus === "Confirmed" && payload.items !== undefined) {
    throw createHttpError(
      400,
      "Line items cannot be changed after confirmation",
    );
  }

  const previousCustomerId = order.customer;

  if (payload.paymentStatus !== undefined) {
    order.paymentStatus = normalizePaymentStatus(payload.paymentStatus);
  }

  if (payload.notes !== undefined) {
    const notes = cleanText(payload.notes);
    order.notes = notes;
    order.note = notes;
  }

  if (payload.trackingNumber !== undefined) {
    order.trackingNumber = cleanText(payload.trackingNumber);
  }

  const nextPhone =
    payload.customerPhone !== undefined
      ? cleanText(payload.customerPhone)
      : order.phone;
  const nextAddress =
    payload.customerAddress !== undefined
      ? cleanText(payload.customerAddress)
      : order.customerAddress || order.address;

  if (!nextPhone) {
    throw createHttpError(400, "Customer phone is required");
  }

  order.phone = nextPhone;
  order.customerPhone = nextPhone;
  order.address = nextAddress;
  order.customerAddress = nextAddress;

  const customer = await findOrCreateCustomer({
    name: order.customerName,
    phone: nextPhone,
    address: nextAddress,
    channel: order.channel,
  });

  order.customer = customer?._id ?? null;

  await order.save();
  await syncCustomerStatsForOrderCustomerSwap(
    previousCustomerId,
    order.customer,
  );

  return order;
}

function canTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;

  const allowed = {
    Pending: ["Confirmed", "Cancelled"],
    Confirmed: ["Shipped", "Cancelled"],
    Shipped: ["Delivered", "Cancelled"],
    Delivered: [],
    Cancelled: [],
  };

  return allowed[currentStatus]?.includes(nextStatus) ?? false;
}

export async function transitionOrderStatus(orderId, payload) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  const currentStatus = normalizeOrderStatus(order.orderStatus);
  const nextStatus = normalizeOrderStatus(
    payload.orderStatus || payload.status,
  );
  const note = cleanText(payload.note);

  order.orderStatus = currentStatus;

  if (!canTransition(currentStatus, nextStatus)) {
    throw createHttpError(
      400,
      `Cannot move an order from ${currentStatus} to ${nextStatus}`,
    );
  }

  if (currentStatus === "Shipped" && nextStatus === "Delivered") {
    if (normalizePaymentStatus(order.paymentStatus) === "unpaid") {
      throw createHttpError(
        400,
        "Cannot mark as Delivered — payment has not been collected for this order.",
      );
    }
  }

  if (payload.paymentStatus !== undefined) {
    order.paymentStatus = normalizePaymentStatus(payload.paymentStatus);
  } else {
    order.paymentStatus = normalizePaymentStatus(order.paymentStatus);
  }

  if (payload.trackingNumber !== undefined) {
    order.trackingNumber = cleanText(payload.trackingNumber);
  }

  if (nextStatus === "Confirmed" && !order.stockApplied) {
    await adjustOrderStock(
      order,
      "deduct",
      `Stock committed when ${order.orderNumber} was confirmed`,
    );
    order.stockApplied = true;
  }

  if (nextStatus === "Cancelled" && order.stockApplied) {
    await adjustOrderStock(
      order,
      "restore",
      `Stock restored when ${order.orderNumber} was cancelled`,
    );
    order.stockApplied = false;
  }

  order.orderStatus = nextStatus;

  if (nextStatus === "Delivered" && order.paymentStatus === "cod") {
    order.codCollected = true;
  }

  if (currentStatus !== nextStatus) {
    order.lifecycleEvents.push({
      status: nextStatus,
      note: note || getStatusChangeNote(currentStatus, nextStatus),
    });
  }

  await order.save();

  if (order.customer) {
    await syncCustomerStats(order.customer);
  }

  return order;
}

export async function registerOrderReturn(orderId, payload) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  order.orderStatus = normalizeOrderStatus(order.orderStatus);

  if (order.orderStatus !== "Delivered") {
    throw createHttpError(400, "Returns are only allowed for delivered orders");
  }

  if (order.hasReturn || order.returnInfo?.returnedAt) {
    throw createHttpError(400, "This order already has a recorded return");
  }

  const reason = cleanText(payload.reason);
  const shouldRestock = payload.restock !== false;

  if (!reason) {
    throw createHttpError(400, "Return reason is required");
  }

  if (shouldRestock && order.stockApplied) {
    await adjustOrderStock(
      order,
      "restore",
      `Returned items restocked for ${order.orderNumber}: ${reason}`,
    );
    order.stockApplied = false;
  }

  order.hasReturn = true;
  order.returnInfo = {
    returnedAt: new Date(),
    reason,
    restocked: shouldRestock,
    note: shouldRestock ? "Items restocked" : "Restock skipped",
  };
  order.lifecycleEvents.push({
    status: "Returned",
    note: reason,
  });

  await order.save();

  if (order.customer) {
    await syncCustomerStats(order.customer);
  }

  return order;
}

export async function deleteOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw createHttpError(404, "Order not found");
  }

  const previousCustomerId = order.customer;

  if (order.stockApplied) {
    await adjustOrderStock(
      order,
      "restore",
      `Stock restored because ${order.orderNumber} was deleted`,
    );
  }

  await order.deleteOne();

  if (previousCustomerId) {
    await syncCustomerStats(previousCustomerId);
  }
}

export function getOrderLifecycleDate(order, status) {
  return getLifecycleDate(order, status);
}
