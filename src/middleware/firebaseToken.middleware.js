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
    console.log("\n=== Firebase Token Verification START ===");
    console.log("> Request URL:", req.originalUrl);
    console.log("> Request Method:", req.method);

    // Extract the token from Authorization header
    const authHeader = req.headers.authorization;
    console.log("> Authorization Header exists:", !!authHeader);
    console.log("> Authorization Header preview:", authHeader ? authHeader.substring(0, 20) + "..." : "N/A");

    // Check if Authorization header exists
    if (!authHeader) {
      console.log("> ERROR: Authorization header is missing");
      return sendError(res, 401, "Authorization header is missing", {
        error: "MISSING_AUTH_HEADER",
      });
    }

    // Check if Authorization header follows Bearer token format
    if (!authHeader.startsWith("Bearer ")) {
      console.log("> ERROR: Invalid authorization format");
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
    console.log("> Token extracted, length:", token.length);
    console.log("> Token preview:", token.substring(0, 30) + "...");

    // Check if token exists after "Bearer "
    if (!token || token.trim() === "") {
      console.log("> ERROR: Token is empty");
      return sendError(res, 401, "Token is missing in authorization header", {
        error: "MISSING_TOKEN",
      });
    }

    // Verify the Firebase ID token
    console.log("> Verifying token with Firebase Admin...");
    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      console.log("> Token verified successfully!");
      console.log("> Decoded token UID:", decodedToken.uid);
      console.log("> Decoded token phone_number:", decodedToken.phone_number);
      console.log("> Full decoded token:", JSON.stringify({
        uid: decodedToken.uid,
        phone_number: decodedToken.phone_number,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified,
        name: decodedToken.name
      }, null, 2));
    } catch (verifyError) {
      console.log("> ERROR during token verification:");
      console.log("> Error code:", verifyError.code);
      console.log("> Error message:", verifyError.message);

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

    console.log("> Extracted UID:", uid);
    console.log("> Extracted phoneNumber:", phoneNumber);

    // Validate that UID exists
    if (!uid) {
      console.log("> ERROR: UID is missing from decoded token");
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

    console.log("> req.firebaseUser created:", JSON.stringify({
      uid: req.firebaseUser.uid,
      phoneNumber: req.firebaseUser.phoneNumber,
      email: req.firebaseUser.email
    }, null, 2));
    console.log("=== Firebase Token Verification END (SUCCESS) ===\n");

    // Proceed to next middleware or route handler
    next();
  } catch (error) {
    // Catch any unexpected errors
    console.error("\n!!! ERROR in Firebase token verification middleware !!!");
    console.error("> Error name:", error.name);
    console.error("> Error message:", error.message);
    console.error("> Error stack:", error.stack);
    console.error("=== Firebase Token Verification END (ERROR) ===\n");

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
