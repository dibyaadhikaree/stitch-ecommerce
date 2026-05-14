import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: null,
    },
  },
  { timestamps: false },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    productCollection: {
      type: String,
      default: "",
      trim: true,
    },
    media: {
      type: [
        {
          url: {
            type: String,
            required: true,
            trim: true,
          },
          type: {
            type: String,
            enum: ["image", "video"],
            default: "image",
          },
          tag: {
            type: String,
            enum: ["front", "back", "detail", "lifestyle", "untagged"],
            default: "untagged",
          },
          isPrimary: {
            type: Boolean,
            default: false,
          },
          sortOrder: {
            type: Number,
            default: 0,
          },
          originalName: {
            type: String,
            default: "",
          },
        },
      ],
      default: [],
    },
    buyingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    extraCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    marketPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    shopVisible: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export const Product = mongoose.model("Product", productSchema);
