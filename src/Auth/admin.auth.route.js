import express from "express";
import { registerAdmin, loginAdmin } from "./admin.auth.controller.js";

const router = express.Router();

/**
 * @route POST /api/auth/admin/register
 * @desc Register a new admin user
 * @access Public (can be protected if you want only existing admins to create new ones)
 */
router.post("/register", registerAdmin);

/**
 * @route POST /api/auth/admin/login
 * @desc Login admin user and get JWT token
 * @access Public
 */
router.post("/login", loginAdmin);

export default router;
