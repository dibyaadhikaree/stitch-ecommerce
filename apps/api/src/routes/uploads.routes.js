import crypto from "node:crypto";

import { Router } from "express";
import multer from "multer";
import { env } from "../config/env.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      const error = new Error("Only image uploads are supported");
      error.status = 400;
      cb(error);
      return;
    }
    cb(null, true);
  },
});

function runSingleImageUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.single("image")(req, res, (err) => {
      if (!err) {
        resolve();
        return;
      }

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          err.status = 413;
          err.message = "Image must be 10 MB or smaller";
        } else {
          err.status = 400;
        }
      }

      reject(err);
    });
  });
}

function ensureCloudinaryConfig() {
  if (
    !env.cloudinaryCloudName ||
    !env.cloudinaryApiKey ||
    !env.cloudinaryApiSecret
  ) {
    const error = new Error("Cloudinary is not configured");
    error.status = 500;
    throw error;
  }
}

async function uploadToCloudinary(file) {
  ensureCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = env.cloudinaryUploadFolder.trim() || "products";
  const signatureBase = `folder=${folder}&timestamp=${timestamp}${env.cloudinaryApiSecret}`;
  const signature = crypto
    .createHash("sha1")
    .update(signatureBase)
    .digest("hex");

  const formData = new FormData();
  formData.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  formData.append("api_key", env.cloudinaryApiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.secure_url) {
    const error = new Error(
      payload?.error?.message || "Cloudinary upload failed",
    );
    error.status = 502;
    throw error;
  }

  return payload;
}

router.post("/", async (req, res) => {
  try {
    await runSingleImageUpload(req, res);
  } catch (err) {
    return res
      .status(err.status || 400)
      .json({ message: err.message || "Upload failed" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  let uploaded;
  try {
    uploaded = await uploadToCloudinary(req.file);
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Upload failed" });
  }

  return res.status(201).json({
    item: {
      name: uploaded.public_id,
      url: uploaded.secure_url,
      originalName: req.file.originalname,
    },
  });
});

export default router;
