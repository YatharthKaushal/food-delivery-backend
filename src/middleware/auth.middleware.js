import jwt from "jsonwebtoken";
import Admin from "../schema/Admin.js";
import { sendError } from "../utils/response.util.js";

/**
 * Authentication middleware - Verifies JWT token
 * Adds user information to req.user if valid
 * @access Protected routes
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(
        res,
        401,
        "Authentication required. Please provide a valid token"
      );
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return sendError(
        res,
        401,
        "Authentication required. Please provide a valid token"
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists and is not deleted
    if (decoded.type === "admin") {
      const admin = await Admin.findOne({
        _id: decoded.id,
        isDeleted: false,
      });

      if (!admin) {
        return sendError(
          res,
          401,
          "User no longer exists or has been deactivated"
        );
      }

      // Attach user info to request
      req.user = {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        type: "admin",
      };
    } else {
      return sendError(res, 401, "Invalid token type");
    }

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.name === "JsonWebTokenError") {
      return sendError(res, 401, "Invalid token. Please login again");
    }

    if (error.name === "TokenExpiredError") {
      return sendError(res, 401, "Token expired. Please login again");
    }

    return sendError(res, 500, "Authentication failed. Please try again");
  }
};

/**
 * Authorization middleware factory - Checks if user has required role(s)
 * Must be used after authenticate middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 * @example
 * router.get('/admin-only', authenticate, authorize('ADMIN'), controller);
 * router.get('/staff', authenticate, authorize('ADMIN', 'KITCHEN_STAFF'), controller);
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return sendError(
          res,
          401,
          "Authentication required. Please login first"
        );
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return sendError(
          res,
          403,
          "Access denied. You do not have permission to access this resource"
        );
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      return sendError(res, 500, "Authorization failed. Please try again");
    }
  };
};
