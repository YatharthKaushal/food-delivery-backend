/**
 * Standardized response utility functions
 * Ensures consistent response structure across all API endpoints
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message
 * @param {*} data - Response data (default: null)
 */
export const sendSuccess = (res, statusCode = 200, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message
 * @param {*} data - Additional error data (default: null)
 */
export const sendError = (res, statusCode = 500, message, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data,
  });
};
