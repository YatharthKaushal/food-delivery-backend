import Customer from "../schema/Customer.schema.js";
import { sendError } from "../utils/response.util.js";

/**
 * Middleware to attach customer to request object
 * Requires verifyFirebaseToken middleware to run first
 */
export const attachCustomer = async (req, res, next) => {
  try {
    const firebaseUid = req.firebaseUser?.uid;

    if (!firebaseUid) {
      return sendError(res, 401, "Authentication required");
    }

    const customer = await Customer.findOne({
      firebaseUid,
      isDeleted: false,
    });

    if (!customer) {
      return sendError(res, 404, "Customer not found");
    }

    req.customer = customer;
    next();
  } catch (error) {
    return sendError(res, 500, "Failed to fetch customer", error.message);
  }
};
