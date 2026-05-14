import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    variantLabel: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      default: "",
      trim: true,
    },
    loggedBy: {
      type: String,
      default: "System",
      trim: true,
    },
    type: {
      type: String,
      enum: ["initial", "stock_in", "sale", "return", "damage", "adjustment"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true },
);

export const InventoryLog = mongoose.model("InventoryLog", inventoryLogSchema);
