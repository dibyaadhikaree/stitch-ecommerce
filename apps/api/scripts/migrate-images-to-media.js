/**
 * One-time migration: copies legacy images[] URLs into media[] and unsets images.
 * Run with: npm run migrate:images
 */

import mongoose from "mongoose";
import { MONGODB_URI } from "../src/config/env.js";

await mongoose.connect(MONGODB_URI);

const Product = mongoose.model(
  "Product",
  new mongoose.Schema({
    images: { type: [String], default: [] },
    media: {
      type: [{ url: String, type: String, isPrimary: Boolean }],
      default: [],
    },
  }),
  "products",
);

const products = await Product.find({ images: { $exists: true, $ne: [] } }).lean();
let migrated = 0;

for (const product of products) {
  if (!product.images?.length) continue;

  const existingUrls = new Set((product.media || []).map((m) => m.url));
  const toAdd = product.images
    .filter((url) => !existingUrls.has(url))
    .map((url) => ({ url, type: "image", isPrimary: false }));

  if (toAdd.length) {
    await Product.updateOne(
      { _id: product._id },
      { $push: { media: { $each: toAdd } }, $unset: { images: "" } },
    );
  } else {
    await Product.updateOne({ _id: product._id }, { $unset: { images: "" } });
  }

  migrated++;
}

console.log(`Migrated ${migrated} product(s).`);
await mongoose.disconnect();
