import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stitch_studio",
  jwtSecret: process.env.JWT_SECRET || "replace-me",
  adminEmail: process.env.ADMIN_EMAIL || "admin@stitchstudio.com",
  adminPassword: process.env.ADMIN_PASSWORD || "change-me",
  webhookSecret: process.env.WEBHOOK_SECRET || "changeme",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryUploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || "products",
  gmailUser: process.env.GMAIL_USER || "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
};

// Named exports for convenience
export const {
  port: PORT,
  clientUrl: CLIENT_URL,
  mongodbUri: MONGODB_URI,
  jwtSecret: JWT_SECRET,
  adminEmail: ADMIN_EMAIL,
  adminPassword: ADMIN_PASSWORD,
  webhookSecret: WEBHOOK_SECRET,
  cloudinaryCloudName: CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: CLOUDINARY_API_KEY,
  cloudinaryApiSecret: CLOUDINARY_API_SECRET,
  cloudinaryUploadFolder: CLOUDINARY_UPLOAD_FOLDER,
  gmailUser: GMAIL_USER,
  gmailAppPassword: GMAIL_APP_PASSWORD,
} = env;
