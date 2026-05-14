import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["received", "processed", "failed"],
      default: "received",
    },
  },
  { timestamps: true },
);

export const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);
