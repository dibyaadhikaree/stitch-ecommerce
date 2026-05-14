import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      default: "STITCH Studio",
      trim: true,
    },
    currency: {
      type: String,
      default: "NPR",
      trim: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    acceptedPaymentMethods: {
      type: [
        {
          type: String,
          enum: ["cash", "bank_transfer", "cod", "esewa", "khalti"],
        },
      ],
      default: ["cash", "bank_transfer", "cod", "esewa", "khalti"],
    },
    orderSequence: {
      type: Number,
      default: 3000,
      min: 3000,
    },
    aboutHeadline: {
      type: String,
      default: "",
    },
    aboutBody: {
      type: String,
      default: "",
    },
    aboutImageUrl: {
      type: String,
      default: "",
    },
    instagramHandle: {
      type: String,
      default: "",
    },
    tiktokHandle: {
      type: String,
      default: "",
    },
    whatsappNumber: {
      type: String,
      default: "",
    },
    seoTitle: {
      type: String,
      default: "STITCH",
    },
    seoDescription: {
      type: String,
      default: "Premium minimal fashion.",
    },
    footerTagline: {
      type: String,
      default: "",
    },
    shippingNote: {
      type: String,
      default: "",
    },
    returnPolicy: {
      type: String,
      default: "",
    },
    sizeGuide: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true },
);

export const Setting = mongoose.model("Setting", settingSchema);
