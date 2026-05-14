import { Router } from "express";

import { StorefrontConfig } from "../models/StorefrontConfig.js";

const router = Router();

router.get("/", async (_req, res) => {
  const config = await StorefrontConfig.getSingleton();
  return res.json({ config });
});

router.patch("/announcement", async (req, res) => {
  const { text, isActive, link } = req.body ?? {};
  const config = await StorefrontConfig.getSingleton();

  if (text !== undefined) config.announcementBar.text = text;
  if (isActive !== undefined) config.announcementBar.isActive = isActive;
  if (link !== undefined) config.announcementBar.link = link;

  await config.save();
  return res.json({ config });
});

router.patch("/featured-title", async (req, res) => {
  const { featuredSectionTitle } = req.body ?? {};

  if (!featuredSectionTitle || typeof featuredSectionTitle !== "string") {
    return res.status(400).json({ message: "featuredSectionTitle is required" });
  }

  const config = await StorefrontConfig.getSingleton();
  config.featuredSectionTitle = featuredSectionTitle;
  await config.save();
  return res.json({ config });
});

router.post("/hero", async (req, res) => {
  const { image, videoUrl, title, subtitle, ctaText, ctaLink, sortOrder } = req.body ?? {};

  const config = await StorefrontConfig.getSingleton();
  config.heroSlides.push({ image, videoUrl, title, subtitle, ctaText, ctaLink, sortOrder });
  await config.save();

  return res.status(201).json({ config });
});

// /hero/reorder must be defined before /hero/:slideId to avoid route shadowing
router.patch("/hero/reorder", async (req, res) => {
  const { order } = req.body ?? {};

  if (!Array.isArray(order)) {
    return res.status(400).json({ message: "order must be an array of slide IDs" });
  }

  const config = await StorefrontConfig.getSingleton();

  const slideMap = new Map(
    config.heroSlides.map((s) => [s._id.toString(), s]),
  );

  const reordered = order
    .filter((id) => slideMap.has(String(id)))
    .map((id, index) => {
      const slide = slideMap.get(String(id));
      slide.sortOrder = index;
      return slide;
    });

  // include any slides that were not in the order array at the end
  const orderedIds = new Set(order.map(String));
  for (const slide of config.heroSlides) {
    if (!orderedIds.has(slide._id.toString())) {
      slide.sortOrder = reordered.length;
      reordered.push(slide);
    }
  }

  config.heroSlides = reordered;
  await config.save();
  return res.json({ config });
});

router.patch("/hero/:slideId", async (req, res) => {
  const { slideId } = req.params;
  const config = await StorefrontConfig.getSingleton();

  const slide = config.heroSlides.id(slideId);
  if (!slide) {
    return res.status(404).json({ message: "Hero slide not found" });
  }

  const { image, videoUrl, title, subtitle, ctaText, ctaLink, isActive, sortOrder } =
    req.body ?? {};

  if (image !== undefined) slide.image = image;
  if (videoUrl !== undefined) slide.videoUrl = videoUrl;
  if (title !== undefined) slide.title = title;
  if (subtitle !== undefined) slide.subtitle = subtitle;
  if (ctaText !== undefined) slide.ctaText = ctaText;
  if (ctaLink !== undefined) slide.ctaLink = ctaLink;
  if (isActive !== undefined) slide.isActive = isActive;
  if (sortOrder !== undefined) slide.sortOrder = sortOrder;

  await config.save();
  return res.json({ config });
});

router.patch("/featured-order", async (req, res) => {
  const { order } = req.body ?? {};

  if (!Array.isArray(order)) {
    return res.status(400).json({ message: "order must be an array of product IDs" });
  }

  const config = await StorefrontConfig.getSingleton();
  config.featuredProductOrder = order;
  await config.save();
  return res.json({ config });
});

router.delete("/hero/:slideId", async (req, res) => {
  const { slideId } = req.params;
  const config = await StorefrontConfig.getSingleton();

  const slide = config.heroSlides.id(slideId);
  if (!slide) {
    return res.status(404).json({ message: "Hero slide not found" });
  }

  slide.deleteOne();
  await config.save();
  return res.json({ message: "Hero slide removed" });
});

export default router;
