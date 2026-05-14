import { Category } from "./models/Category.js";
import { Expense } from "./models/Expense.js";
import { InventoryLog } from "./models/InventoryLog.js";
import { Order } from "./models/Order.js";
import { Product } from "./models/Product.js";
import { Setting } from "./models/Setting.js";
import { slugify } from "./lib/slugify.js";

async function seedCategories() {
  const count = await Category.countDocuments();
  if (count > 0) return;

  return Category.insertMany([
    {
      name: "T-Shirts",
      slug: "t-shirts",
      description: "Core monochrome tees and elevated basics.",
    },
    {
      name: "Hoodies",
      slug: "hoodies",
      description: "Heavyweight statement layers.",
    },
    {
      name: "Sets",
      slug: "sets",
      description: "Coordinated outfit combinations.",
    },
  ]);
}

async function seedProducts() {
  const productCount = await Product.countDocuments();
  if (productCount > 0) return;

  const categories = await Category.find().lean();
  const tee = categories.find((item) => item.name === "T-Shirts");
  const hoodie = categories.find((item) => item.name === "Hoodies");
  const set = categories.find((item) => item.name === "Sets");

  if (!tee || !hoodie || !set) return;

  return Product.insertMany([
    {
      name: "Shadow Bloom Tee",
      slug: slugify("Shadow Bloom Tee"),
      category: tee._id,
      buyingPrice: 1800,
      extraCost: 200,
      costPrice: 2000,
      sellingPrice: 3200,
      marketPrice: 3600,
      status: "active",
      variants: [
        { size: "M", sku: "STITCH-SBT-M", stock: 18, sold: 12 },
        { size: "L", sku: "STITCH-SBT-L", stock: 8, sold: 9 },
      ],
    },
    {
      name: "Obsidian Hoodie",
      slug: slugify("Obsidian Hoodie"),
      category: hoodie._id,
      buyingPrice: 3400,
      extraCost: 400,
      costPrice: 3800,
      sellingPrice: 5900,
      marketPrice: 6600,
      status: "active",
      variants: [
        { size: "XL", sku: "STITCH-OH-XL", stock: 12, sold: 5 },
        { size: "L", sku: "STITCH-OH-L", stock: 7, sold: 3 },
      ],
    },
    {
      name: "Ivory Motion Set",
      slug: slugify("Ivory Motion Set"),
      category: set._id,
      buyingPrice: 4700,
      extraCost: 500,
      costPrice: 5200,
      sellingPrice: 7400,
      marketPrice: 8100,
      status: "active",
      variants: [{ size: "S", sku: "STITCH-IMS-S", stock: 5, sold: 6 }],
    },
  ]);
}

async function seedInventory() {
  const count = await InventoryLog.countDocuments();
  if (count > 0) return;

  const products = await Product.find();
  if (!products.length) return;

  const entries = [];
  for (const product of products) {
    for (const variant of product.variants) {
      entries.push({
        product: product._id,
        productName: product.name,
        variantId: variant._id,
        variantLabel: `${product.name} / ${variant.size}`,
        sku: variant.sku,
        type: "stock_in",
        quantity: variant.stock,
        note: "Initial Stock",
      });
    }
  }

  return InventoryLog.insertMany(entries);
}

async function seedOrders() {
  const count = await Order.countDocuments();
  if (count > 0) return;

  const products = await Product.find();
  if (!products.length) return;

  const tee = products.find((item) => item.name === "Shadow Bloom Tee");
  const hoodie = products.find((item) => item.name === "Obsidian Hoodie");
  if (!tee || !hoodie) return;

  const teeVariant = tee.variants[0];
  const hoodieVariant = hoodie.variants[0];

  return Order.insertMany([
    {
      orderNumber: "ORD-3001",
      customerName: "Anisha K.",
      phone: "9800000001",
      address: "Kathmandu",
      source: "Website",
      paymentStatus: "Paid",
      orderStatus: "Shipped",
      totalAmount: 5900,
      items: [
        {
          product: hoodie._id,
          productName: hoodie.name,
          variantId: hoodieVariant._id,
          sku: hoodieVariant.sku,
          size: hoodieVariant.size,
          quantity: 1,
          price: hoodie.sellingPrice,
          lineTotal: hoodie.sellingPrice,
        },
      ],
    },
    {
      orderNumber: "ORD-3002",
      customerName: "Sanjiv R.",
      phone: "9800000002",
      address: "Lalitpur",
      source: "Instagram",
      paymentStatus: "COD",
      orderStatus: "Pending",
      totalAmount: 3200,
      items: [
        {
          product: tee._id,
          productName: tee.name,
          variantId: teeVariant._id,
          sku: teeVariant.sku,
          size: teeVariant.size,
          quantity: 1,
          price: tee.sellingPrice,
          lineTotal: tee.sellingPrice,
        },
      ],
    },
  ]);
}

async function seedExpenses() {
  const count = await Expense.countDocuments();
  if (count > 0) return;

  return Expense.insertMany([
    {
      title: "Packaging Materials",
      category: "Operations",
      amount: 5400,
      note: "April packaging stock",
    },
    {
      title: "Content Shoot",
      category: "Marketing",
      amount: 18000,
      note: "Campaign visual production",
    },
  ]);
}

async function seedSettings() {
  const count = await Setting.countDocuments();
  if (count > 0) return;

  return Setting.create({
    shopName: "STITCH Studio",
    currency: "NPR",
    lowStockThreshold: 5,
  });
}

export async function ensureSeedData() {
  await seedCategories();
  await seedProducts();
  await seedInventory();
  await seedOrders();
  await seedExpenses();
  await seedSettings();
}
