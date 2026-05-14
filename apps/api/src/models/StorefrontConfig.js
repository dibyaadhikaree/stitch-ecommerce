import mongoose from "mongoose";

const heroSlideSchema = new mongoose.Schema(
  {
    image: String,
    videoUrl: { type: String, default: '' },
    title: String,
    subtitle: String,
    ctaText: String,
    ctaLink: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: false },
);

const storefrontConfigSchema = new mongoose.Schema(
  {
    heroSlides: {
      type: [heroSlideSchema],
      default: [],
    },
    announcementBar: {
      text: { type: String, default: "" },
      isActive: { type: Boolean, default: false },
      link: { type: String, default: "" },
    },
    featuredSectionTitle: { type: String, default: "Featured" },
    featuredProductOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true },
);

storefrontConfigSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

export const StorefrontConfig = mongoose.model(
  "StorefrontConfig",
  storefrontConfigSchema,
);
