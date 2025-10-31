/**
 * Firebase Token Verification Middleware
 *
 * This middleware verifies Firebase ID tokens sent from the frontend
 * and extracts the user's UID and phone number for authenticated requests.
 *
 * Usage: Add this middleware to routes that require Firebase authentication
 * Example: router.get('/protected-route', verifyFirebaseToken, controller)
 */

import { firebaseAdmin } from "../config/firebase.config.js";
import { sendError } from "../utils/response.util.js";

/**
 * Middleware to verify Firebase ID token and extract user information
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Extract the token from Authorization header
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return sendError(res, 401, "Authorization header is missing", {
        error: "MISSING_AUTH_HEADER",
      });
    }

    // Check if Authorization header follows Bearer token format
    if (!authHeader.startsWith("Bearer ")) {
      return sendError(
        res,
        401,
        "Invalid authorization format. Expected 'Bearer <token>'",
        {
          error: "INVALID_AUTH_FORMAT",
        }
      );
    }

    // Extract the token (remove "Bearer " prefix)
    const token = authHeader.substring(7);

    // Check if token exists after "Bearer "
    if (!token || token.trim() === "") {
      return sendError(res, 401, "Token is missing in authorization header", {
        error: "MISSING_TOKEN",
      });
    }

    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    } catch (verifyError) {
      // Handle specific Firebase token verification errors
      if (verifyError.code === "auth/id-token-expired") {
        return sendError(
          res,
          401,
          "Token has expired. Please refresh your authentication",
          {
            error: "TOKEN_EXPIRED",
          }
        );
      }

      if (verifyError.code === "auth/id-token-revoked") {
        return sendError(
          res,
          401,
          "Token has been revoked. Please re-authenticate",
          {
            error: "TOKEN_REVOKED",
          }
        );
      }

      if (verifyError.code === "auth/argument-error") {
        return sendError(res, 401, "Invalid token format", {
          error: "INVALID_TOKEN_FORMAT",
        });
      }

      // Generic token verification failure
      return sendError(res, 401, "Failed to verify authentication token", {
        error: "TOKEN_VERIFICATION_FAILED",
        details:
          process.env.NODE_ENV === "development"
            ? verifyError.message
            : undefined,
      });
    }

    // Extract UID (always present in decoded token)
    const uid = decodedToken.uid;

    // Extract phone number (may not always be present)
    const phoneNumber = decodedToken.phone_number || null;

    // Validate that UID exists
    if (!uid) {
      return sendError(res, 401, "Invalid token: User ID not found", {
        error: "MISSING_UID",
      });
    }

    // Attach user information to request object for use in route handlers
    req.firebaseUser = {
      uid,
      phoneNumber,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      // Include full decoded token for advanced use cases
      decodedToken,
    };

    // Log successful authentication in development
    if (process.env.NODE_ENV === "development") {
      console.log(`> Firebase auth verified for UID: ${uid}`);
    }

    // Proceed to next middleware or route handler
    next();
  } catch (error) {
    // Catch any unexpected errors
    console.error("Error in Firebase token verification middleware:", error);

    return sendError(res, 500, "Internal server error during authentication", {
      error: "INTERNAL_AUTH_ERROR",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Optional middleware to verify Firebase token and allow requests to proceed
 * even if authentication fails (useful for optional authentication routes)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const verifyFirebaseTokenOptional = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // If no auth header, proceed without authentication
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.firebaseUser = null;
      return next();
    }

    const token = authHeader.substring(7);

    // If no token, proceed without authentication
    if (!token || token.trim() === "") {
      req.firebaseUser = null;
      return next();
    }

    try {
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

      req.firebaseUser = {
        uid: decodedToken.uid,
        phoneNumber: decodedToken.phone_number || null,
        email: decodedToken.email || null,
        emailVerified: decodedToken.email_verified || false,
        name: decodedToken.name || null,
        picture: decodedToken.picture || null,
        decodedToken,
      };
    } catch (verifyError) {
      // Token verification failed, but proceed without authentication
      req.firebaseUser = null;
    }

    next();
  } catch (error) {
    console.error("Error in optional Firebase token verification:", error);
    // Even on error, proceed without authentication
    req.firebaseUser = null;
    next();
  }
};

/**
 * Middleware to ensure phone number exists in the verified token
 * Use this after verifyFirebaseToken for routes that specifically require phone auth
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const requirePhoneNumber = (req, res, next) => {
  if (!req.firebaseUser) {
    return sendError(res, 401, "Authentication required", {
      error: "NOT_AUTHENTICATED",
    });
  }

  if (!req.firebaseUser.phoneNumber) {
    return sendError(res, 403, "Phone number authentication required", {
      error: "PHONE_NUMBER_REQUIRED",
    });
  }

  next();
};
