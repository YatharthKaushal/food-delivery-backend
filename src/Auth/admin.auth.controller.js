import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin, { ADMIN_ROLES } from "../schema/Admin.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import { HTTP_STATUS, ERROR_MESSAGES } from "../constants/index.js";

/**
 * Register a new admin user
 * @route POST /api/auth/admin/register
 * @access Public (or can be protected to only allow existing admins to create new ones)
 */
export const registerAdmin = async (req, res) => {
  try {
    const { name, username, password, email, phone, role } = req.body;

    // Validate required fields
    if (!name || !username || !password) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Name, username, and password are required fields"
      );
    }

    // Validate role if provided
    if (role && !Object.values(ADMIN_ROLES).includes(role.toUpperCase())) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Invalid role. Must be either ${ADMIN_ROLES.ADMIN} or ${ADMIN_ROLES.KITCHEN_STAFF}`
      );
    }

    // Check if username already exists
    const existingAdmin = await Admin.findOne({
      username: username.toLowerCase(),
      isDeleted: false,
    });

    if (existingAdmin) {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        "Username already exists. Please choose a different username"
      );
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await Admin.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      });

      if (existingEmail) {
        return sendError(
          res,
          HTTP_STATUS.CONFLICT,
          "Email already registered. Please use a different email"
        );
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new admin
    const newAdmin = new Admin({
      name,
      username: username.toLowerCase(),
      password: hashedPassword,
      email: email ? email.toLowerCase() : undefined,
      phone,
      role: role ? role.toUpperCase() : ADMIN_ROLES.KITCHEN_STAFF,
    });

    // Save to database
    await newAdmin.save();

    // Return success response (exclude password)
    return sendSuccess(res, HTTP_STATUS.CREATED, "Admin registered successfully", {
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        username: newAdmin.username,
        email: newAdmin.email,
        phone: newAdmin.phone,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt,
      },
    });
  } catch (error) {
    console.error("Admin registration error:", error);

    // Handle mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return sendError(res, 400, messages.join(", "));
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      );
    }

    return sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to register admin. Please try again");
  }
};

/**
 * Login admin user
 * @route POST /api/auth/admin/login
 * @access Public
 */
export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return sendError(res, 400, "Username and password are required");
    }

    // Find admin by username (include password field for verification)
    const admin = await Admin.findOne({
      username: username.toLowerCase(),
      isDeleted: false,
    }).select("+password");

    if (!admin) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, "Invalid username or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, "Invalid username or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        type: "admin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d", // Token expires in 7 days
      }
    );

    // Return success response with token
    return sendSuccess(res, HTTP_STATUS.OK, "Login successful", {
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to login. Please try again");
  }
};
