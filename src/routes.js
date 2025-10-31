import express from "express";
import cloudinaryRoutes from "./cloudinary/cloudinary.route.js";
import adminAuthRoutes from "./Auth/admin.auth.route.js";
import customerAuthRoutes from "./Auth/customer.auth.route.js";
import driverAuthRoutes from "./Auth/driver.auth.route.js";
import menuItemRoutes from "./MenuItem/menuItem.route.js";
import addonRoutes from "./MenuItem/addon.route.js";
import subscriptionPlanRoutes from "./Subpscription/subscriptionplan.route.js";
import subscriptionRoutes from "./Subpscription/subscription.route.js";
import voucherRoutes from "./Subpscription/voucher.route.js";

const router = express.Router();

/**
 * Register all application routes here
 */

// Authentication routes
// prefix: /api (example, /api/auth/admin)
router.use("/auth/admin", adminAuthRoutes);
router.use("/auth/customer", customerAuthRoutes);
router.use("/auth/delivery-driver", driverAuthRoutes);

// Cloudinary file upload routes
// prefix: /api (example, /api/cloudinary)
router.use("/cloudinary", cloudinaryRoutes);

// Menu item routes
// prefix: /api (example, /api/menu-items)
router.use("/menu-items", menuItemRoutes);

// Addon routes
// prefix: /api (example, /api/addons)
router.use("/addons", addonRoutes);

// Subscription plan routes
// prefix: /api (example, /api/subscription-plans)
router.use("/subscription-plans", subscriptionPlanRoutes);

// Subscription routes
// prefix: /api (example, /api/subscriptions)
router.use("/subscriptions", subscriptionRoutes);

// Voucher routes
// prefix: /api (example, /api/vouchers)
router.use("/vouchers", voucherRoutes);

// Add other routes here as needed

export default router;
