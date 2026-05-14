import { Router } from "express";

import authRoutes from "./auth.routes.js";
import categoriesRoutes from "./categories.routes.js";
import collectionsRoutes from "./collections.routes.js";
import customersRoutes from "./customers.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import expensesRoutes from "./expenses.routes.js";
import healthRoutes from "./health.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import ordersRoutes from "./orders.routes.js";
import productsRoutes from "./products.routes.js";
import promoRoutes, { handleValidatePromo } from "./promo.routes.js";
import settingsRoutes from "./settings.routes.js";
import storeRoutes from "./store.routes.js";
import storefrontAdminRoutes from "./storefront.admin.routes.js";
import uploadsRoutes from "./uploads.routes.js";
import webhooksRoutes from "./webhooks.routes.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public routes
router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/store", storeRoutes);
router.use("/webhooks", webhooksRoutes);
router.post("/promo/validate", handleValidatePromo);

// Protected routes
router.use(requireAuth);
router.use("/collections", collectionsRoutes);
router.use("/customers", customersRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/categories", categoriesRoutes);
router.use("/expenses", expensesRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/orders", ordersRoutes);
router.use("/products", productsRoutes);
router.use("/promo", promoRoutes);
router.use("/settings", settingsRoutes);
router.use("/storefront", storefrontAdminRoutes);
router.use("/uploads", uploadsRoutes);

export default router;
