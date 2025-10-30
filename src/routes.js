import express from "express";
import cloudinaryRoutes from "./cloudinary/cloudinary.route.js";

const router = express.Router();

/**
 * Register all application routes here
 */

// Cloudinary file upload routes
router.use("/cloudinary", cloudinaryRoutes);

// Add other routes here as needed
// Example:
// import menuItemRoutes from "./menu/menuItem.route.js";
// router.use("/menu-items", menuItemRoutes);

export default router;
