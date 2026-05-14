import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    channel: {
      type: String,
      enum: ["instagram", "facebook", "website", "manual"],
      default: "manual",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const Customer = mongoose.model("Customer", customerSchema);
