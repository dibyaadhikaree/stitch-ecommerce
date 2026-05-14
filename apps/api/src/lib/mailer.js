import nodemailer from "nodemailer";
import { GMAIL_USER, GMAIL_APP_PASSWORD } from "../config/env.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

export async function sendNewOrderEmail(order) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return;

  try {
    const itemLines = order.items
      .map(
        (i) =>
          `${i.productName} (${i.size}) × ${i.quantity} — NPR ${i.price * i.quantity}`,
      )
      .join("\n");

    const totalAmount = order.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );

    const promo = order.appliedPromo;
    const promoLines = promo?.code
      ? [
          `Promo: ${promo.code} — NPR ${promo.discount} off`,
          `Final total: NPR ${order.finalTotal ?? totalAmount - (promo.discount ?? 0)}`,
        ]
      : [];

    await transporter.sendMail({
      from: `STITCH Orders <${GMAIL_USER}>`,
      to: "rychwear@gmail.com",
      subject: `New Order #${order.orderNumber}`,
      text: [
        `New order received on STITCH Studio.`,
        ``,
        `Order: #${order.orderNumber}`,
        `Customer: ${order.customerName}`,
        `Phone: ${order.phone}`,
        `Address: ${order.address}, ${order.city || ""}`,
        order.note ? `Note: ${order.note}` : "",
        ``,
        `Items:`,
        itemLines,
        ``,
        `Subtotal: NPR ${totalAmount}`,
        ...promoLines,
        promoLines.length === 0 ? `Total: NPR ${totalAmount}` : "",
        ``,
        `Log in to the admin panel to confirm this order.`,
      ]
        .filter((line) => line !== undefined && line !== null)
        .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
        .join("\n"),
    });
  } catch (err) {
    console.error("Order email failed:", err.message);
  }
}
