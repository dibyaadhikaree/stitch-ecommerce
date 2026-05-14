import mongoose from "mongoose";

function normalizePaymentStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized) return "unpaid";
  if (normalized === "pending") return "unpaid";
  if (normalized === "paid") return "cash";
  if (normalized === "cod") return "cod";
  if (normalized === "bank transfer") return "bank_transfer";

  return normalized;
}

function normalizeOrderStatus(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized) return "Pending";
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "processing" || normalized === "packed") return "Shipped";
  if (normalized === "shipped") return "Shipped";
  if (normalized === "delivered") return "Delivered";
  if (normalized === "cancelled" || normalized === "canceled") return "Cancelled";

  return "Pending";
}

function normalizeChannel(value) {
  const lower = String(value || "").trim().toLowerCase();
  const map = {
    website: "website",
    instagram: "instagram",
    facebook: "facebook",
    manual: "manual",
    // legacy capitalized values
    Website: "website",
    Instagram: "instagram",
    Manual: "manual",
  };
  return map[lower] || map[value] || "manual";
}

const orderItemSchema = new mongoose.Schema(
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
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    customerAddress: {
      type: String,
      default: "",
      trim: true,
    },
    channel: {
      type: String,
      enum: ["website", "instagram", "facebook", "manual"],
      default: "manual",
    },
    trackingNumber: {
      type: String,
      default: "",
      trim: true,
    },
    codCollected: {
      type: Boolean,
      default: false,
    },
    hasReturn: {
      type: Boolean,
      default: false,
    },
    returnRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    returnInfo: {
      returnedAt: {
        type: Date,
        default: null,
      },
      reason: {
        type: String,
        default: "",
        trim: true,
      },
      restocked: {
        type: Boolean,
        default: false,
      },
      note: {
        type: String,
        default: "",
        trim: true,
      },
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    finalTotal: {
      type: Number,
    },
    appliedPromo: {
      code: { type: String, default: null },
      type: { type: String, default: null },
      value: { type: Number, default: null },
      discount: { type: Number, default: null },
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "cash", "bank_transfer", "cod", "esewa", "khalti"],
      default: "unpaid",
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    stockApplied: {
      type: Boolean,
      default: false,
    },
    lifecycleEvents: {
      type: [
        {
          status: { type: String, required: true },
          changedAt: { type: Date, default: Date.now },
          note: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

orderSchema.pre("validate", function syncLegacyFields(next) {
  this.paymentStatus = normalizePaymentStatus(this.paymentStatus);
  this.orderStatus = normalizeOrderStatus(this.orderStatus);

  // Normalize channel from legacy source field
  if (!this.channel && this.source) {
    this.channel = normalizeChannel(this.source);
  }
  if (this.channel) {
    this.channel = normalizeChannel(this.channel);
  }

  if (!this.customerPhone && this.phone) {
    this.customerPhone = this.phone;
  }
  if (!this.phone && this.customerPhone) {
    this.phone = this.customerPhone;
  }

  if (!this.customerAddress && this.address) {
    this.customerAddress = this.address;
  }
  if (!this.address && this.customerAddress) {
    this.address = this.customerAddress;
  }

  if (!this.notes && this.note) {
    this.notes = this.note;
  }
  if (!this.note && this.notes) {
    this.note = this.notes;
  }

  this.hasReturn = Boolean(this.hasReturn || this.returnInfo?.returnedAt);

  next();
});

export const Order = mongoose.model("Order", orderSchema);
