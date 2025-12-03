import Customer from "../schema/Customer.schema.js";
import Order from "../schema/Order.schema.js";
import Subscription from "../schema/Subscription.schema.js";
import Voucher from "../schema/Voucher.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import { firebaseAdmin } from "../config/firebase.config.js";

/**
 * Get customer profile completion status
 * @route GET /api/auth/customer/status
 * @access Protected (Firebase Token Required)
 */
export const getIsProfileComplete = async (req, res) => {
  try {
    console.log("\n=== getIsProfileComplete START ===");

    // Extract Firebase user data from middleware
    console.log("> Step 1: Extracting Firebase user data from req.firebaseUser");
    console.log("> req.firebaseUser exists:", !!req.firebaseUser);
    console.log("> Full firebaseUser object:", JSON.stringify(req.firebaseUser, null, 2));

    const { uid, phoneNumber } = req.firebaseUser;
    console.log("> Extracted UID:", uid);
    console.log("> Extracted Phone:", phoneNumber);

    // Validate that we have either uid or phone number
    if (!uid && !phoneNumber) {
      console.log("> ERROR: No user identification found");
      return sendError(res, 400, "User identification not found in token", {
        error: "MISSING_USER_IDENTIFICATION",
      });
    }

    // Build query to find customer by firebaseUid or phone
    const query = {
      isDeleted: false,
    };

    if (uid) {
      query.firebaseUid = uid;
    } else if (phoneNumber) {
      query.phone = phoneNumber;
    }

    console.log("> Step 2: Built query:", JSON.stringify(query, null, 2));

    // Check if customer profile exists
    console.log("> Step 3: Searching for customer in database...");
    let customer = await Customer.findOne(query);
    console.log("> Customer found:", customer ? "YES" : "NO");
    if (customer) {
      console.log("> Existing customer ID:", customer._id);
      console.log("> Existing customer data:", JSON.stringify({
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        firebaseUid: customer.firebaseUid,
        isProfileComplete: customer.isProfileComplete
      }, null, 2));
    }

    // If customer doesn't exist, create a new record
    if (!customer) {
      console.log("> Step 4: Customer not found, creating new customer...");
      const newCustomerData = {
        phone: phoneNumber || null,
        firebaseUid: uid,
        isProfileComplete: false,
      };
      console.log("> New customer data:", JSON.stringify(newCustomerData, null, 2));

      try {
        customer = await Customer.create(newCustomerData);
        console.log("> SUCCESS: New customer created with ID:", customer._id);

        return sendSuccess(res, 201, "Customer profile created successfully", {
          isProfileComplete: false,
          customerId: customer._id,
          isNewUser: true,
        });
      } catch (createError) {
        console.log("> ERROR during customer creation:");
        console.log("> Error code:", createError.code);
        console.log("> Error name:", createError.name);
        console.log("> Error message:", createError.message);
        console.log("> Full error:", JSON.stringify(createError, null, 2));

        // Handle duplicate key errors
        if (createError.code === 11000) {
          console.log("> Duplicate key error detected");
          return sendError(
            res,
            409,
            "Customer profile already exists with this phone number or Firebase UID",
            {
              error: "DUPLICATE_CUSTOMER",
            }
          );
        }

        console.log("> Rethrowing error to outer catch block");
        throw createError;
      }
    }

    // Return existing customer's profile completion status
    console.log("> Step 5: Returning existing customer's profile status");
    const responseData = {
      isProfileComplete: customer.isProfileComplete,
      customerId: customer._id,
      isNewUser: false,
      hasName: !!customer.name,
      hasDietaryPreferences: !!customer.dietaryPreferences?.foodType,
    };
    console.log("> Response data:", JSON.stringify(responseData, null, 2));
    console.log("=== getIsProfileComplete END (SUCCESS) ===\n");

    return sendSuccess(res, 200, "Profile status retrieved successfully", responseData);
  } catch (error) {
    console.error("\n!!! ERROR in getIsProfileComplete !!!");
    console.error("> Error name:", error.name);
    console.error("> Error message:", error.message);
    console.error("> Error stack:", error.stack);
    console.error("> Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error("=== getIsProfileComplete END (ERROR) ===\n");

    return sendError(
      res,
      500,
      "Failed to retrieve profile status",
      process.env.NODE_ENV === "development"
        ? { error: error.message, stack: error.stack }
        : undefined
    );
  }
};

/**
 * Complete customer onboarding by updating profile
 * @route PUT /api/auth/customer/onboarding
 * @access Protected (Firebase Token Required)
 */
export const onBoardingUser = async (req, res) => {
  try {
    // Extract Firebase user data from middleware
    const { uid, phoneNumber } = req.firebaseUser;

    // Validate that we have user identification
    if (!uid && !phoneNumber) {
      return sendError(res, 400, "User identification not found in token", {
        error: "MISSING_USER_IDENTIFICATION",
      });
    }

    // Extract and validate request body
    const { name, email, dietaryPreferences } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return sendError(res, 400, "Name is required for onboarding", {
        error: "MISSING_NAME",
      });
    }

    // Validate name length
    if (name.trim().length < 2) {
      return sendError(res, 400, "Name must be at least 2 characters long", {
        error: "INVALID_NAME_LENGTH",
      });
    }

    if (name.trim().length > 100) {
      return sendError(res, 400, "Name cannot exceed 100 characters", {
        error: "INVALID_NAME_LENGTH",
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return sendError(res, 400, "Please provide a valid email address", {
          error: "INVALID_EMAIL_FORMAT",
        });
      }
    }

    // Validate dietary preferences if provided
    if (dietaryPreferences) {
      const { foodType, spiceLevel, dabbaType } = dietaryPreferences;

      // Validate foodType enum
      if (
        foodType &&
        !["VEG", "NON-VEG", "VEGAN"].includes(foodType.toUpperCase())
      ) {
        return sendError(res, 400, "Invalid food type", {
          error: "INVALID_FOOD_TYPE",
          allowedValues: ["VEG", "NON-VEG", "VEGAN"],
        });
      }

      // Validate spiceLevel enum
      if (
        spiceLevel &&
        !["HIGH", "MEDIUM", "LOW"].includes(spiceLevel.toUpperCase())
      ) {
        return sendError(res, 400, "Invalid spice level", {
          error: "INVALID_SPICE_LEVEL",
          allowedValues: ["HIGH", "MEDIUM", "LOW"],
        });
      }

      // Validate dabbaType enum
      if (
        dabbaType &&
        !["DISPOSABLE", "STEEL DABBA"].includes(dabbaType.toUpperCase())
      ) {
        return sendError(res, 400, "Invalid dabba type", {
          error: "INVALID_DABBA_TYPE",
          allowedValues: ["DISPOSABLE", "STEEL DABBA"],
        });
      }
    }

    // Build query to find customer
    const query = {
      isDeleted: false,
    };

    if (uid) {
      query.firebaseUid = uid;
    } else if (phoneNumber) {
      query.phone = phoneNumber;
    }

    // Check if customer profile exists
    let customer = await Customer.findOne(query);

    if (!customer) {
      return sendError(
        res,
        404,
        "Customer profile not found. Please check profile status first",
        {
          error: "CUSTOMER_NOT_FOUND",
        }
      );
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
    };

    // Add email if provided
    if (email) {
      updateData.email = email.trim().toLowerCase();
    }

    // Add dietary preferences if provided
    if (dietaryPreferences) {
      updateData.dietaryPreferences = {
        ...customer.dietaryPreferences,
        ...dietaryPreferences,
      };

      // Normalize enum values to uppercase
      if (dietaryPreferences.foodType) {
        updateData.dietaryPreferences.foodType =
          dietaryPreferences.foodType.toUpperCase();
      }
      if (dietaryPreferences.spiceLevel) {
        updateData.dietaryPreferences.spiceLevel =
          dietaryPreferences.spiceLevel.toUpperCase();
      }
      if (dietaryPreferences.dabbaType) {
        updateData.dietaryPreferences.dabbaType =
          dietaryPreferences.dabbaType.toUpperCase();
      }
    }

    // Set isProfileComplete to true if we have name and dietary preferences
    const hasDietaryPrefs =
      dietaryPreferences?.foodType || customer.dietaryPreferences?.foodType;

    if (name && hasDietaryPrefs) {
      updateData.isProfileComplete = true;
    }

    // Update customer profile
    try {
      customer = await Customer.findOneAndUpdate(
        query,
        { $set: updateData },
        {
          new: true,
          runValidators: true,
        }
      );

      console.log(`> Customer profile updated for UID: ${uid}`);

      return sendSuccess(res, 200, "Profile updated successfully", {
        customerId: customer._id,
        isProfileComplete: customer.isProfileComplete,
        name: customer.name,
        email: customer.email,
        dietaryPreferences: customer.dietaryPreferences,
      });
    } catch (updateError) {
      // Handle duplicate email error
      if (updateError.code === 11000) {
        return sendError(
          res,
          409,
          "Email address is already registered with another account",
          {
            error: "DUPLICATE_EMAIL",
          }
        );
      }

      // Handle validation errors
      if (updateError.name === "ValidationError") {
        const validationErrors = Object.values(updateError.errors).map(
          (err) => err.message
        );
        return sendError(res, 400, "Validation failed", {
          error: "VALIDATION_ERROR",
          details: validationErrors,
        });
      }

      throw updateError;
    }
  } catch (error) {
    console.error("Error in onBoardingUser:", error);
    return sendError(
      res,
      500,
      "Failed to update customer profile",
      process.env.NODE_ENV === "development"
        ? { error: error.message }
        : undefined
    );
  }
};

/**
 * Request account deletion for customer
 * @description Initiates account deletion request. Does not immediately delete the account,
 *              but schedules it for deletion after a grace period.
 * @route DELETE /api/auth/customer/delete-account
 * @access Protected (Firebase Token Required)
 * @param {import('express').Request} req - Express request object
 * @param {Object} req.firebaseUser - Firebase user data from middleware
 * @param {string} req.firebaseUser.uid - Firebase user ID
 * @param {string} req.firebaseUser.phoneNumber - User's phone number
 * @param {import('express').Response} res - Express response object
 * @returns {Object} Success response with deletion scheduled message
 */
export const requestAccountDeletion = async (req, res) => {
  try {
    // Extract Firebase user data from middleware
    const { uid, phoneNumber } = req.firebaseUser;

    // Log the deletion request
    console.log("\n=== Account Deletion Request ===");
    console.log("> Firebase UID:", uid);
    console.log("> Phone Number:", phoneNumber);
    console.log("> Request Time:", new Date().toISOString());
    console.log("================================\n");

    // Validate that we have user identification
    if (!uid && !phoneNumber) {
      return sendError(res, 400, "User identification not found in token", {
        error: "MISSING_USER_IDENTIFICATION",
      });
    }

    // Build query to find customer
    const query = {
      isDeleted: false,
    };

    if (uid) {
      query.firebaseUid = uid;
    } else if (phoneNumber) {
      query.phone = phoneNumber;
    }

    // Verify customer exists
    const customer = await Customer.findOne(query);

    if (!customer) {
      return sendError(res, 404, "Customer profile not found", {
        error: "CUSTOMER_NOT_FOUND",
      });
    }

    // Log customer details for the deletion request
    console.log("> Account Deletion Requested for:");
    console.log(">   Customer ID:", customer._id);
    console.log(">   Name:", customer.name || "N/A");
    console.log(">   Phone:", customer.phone || "N/A");
    console.log(">   Email:", customer.email || "N/A");

    return sendSuccess(
      res,
      200,
      "Your account will be deleted in 10 days.",
      {
        customerId: customer._id,
        scheduledDeletionDate: new Date(
          Date.now() + 10 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }
    );
  } catch (error) {
    console.error("Error in requestAccountDeletion:", error);
    return sendError(
      res,
      500,
      "Failed to process account deletion request",
      process.env.NODE_ENV === "development"
        ? { error: error.message }
        : undefined
    );
  }
};

/**
 * Create a test customer for development/testing purposes
 * @route POST /api/auth/customer/test
 * @access Protected (Admin Only)
 */
export const createTestCustomer = async (req, res) => {
  try {
    // Extract phone number from request body
    const { phoneNumber } = req.body;

    // Validate phone number
    if (!phoneNumber) {
      return sendError(res, 400, "Phone number is required", {
        error: "MISSING_PHONE_NUMBER",
      });
    }

    // Validate phone number format (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return sendError(
        res,
        400,
        "Please provide a valid 10-digit phone number",
        {
          error: "INVALID_PHONE_FORMAT",
        }
      );
    }

    // Generate a unique test UID based on phone number
    const TEST_UID = `test-user-${phoneNumber}`;

    // Check if test customer already exists
    const existingCustomer = await Customer.findOne({
      $or: [
        { phone: phoneNumber, isDeleted: false },
        { firebaseUid: TEST_UID, isDeleted: false },
      ],
    });

    if (existingCustomer) {
      return sendError(
        res,
        409,
        "Test customer already exists with this phone number",
        {
          error: "DUPLICATE_TEST_CUSTOMER",
          customerId: existingCustomer._id,
        }
      );
    }

    // Create custom token with Firebase Admin
    let customToken;
    try {
      customToken = await firebaseAdmin
        .auth()
        .createCustomToken(TEST_UID, { phone_number: `+91${phoneNumber}` });
    } catch (tokenError) {
      console.error("Error creating custom token:", tokenError);
      return sendError(res, 500, "Failed to generate authentication token", {
        error: "TOKEN_GENERATION_FAILED",
        details:
          process.env.NODE_ENV === "development"
            ? tokenError.message
            : undefined,
      });
    }

    // Create customer record in database
    let customer;
    try {
      customer = await Customer.create({
        phone: phoneNumber,
        firebaseUid: TEST_UID,
        isProfileComplete: false,
        name: `Test User ${phoneNumber}`,
      });

      console.log(`> Test customer created with UID: ${TEST_UID}`);

      return sendSuccess(res, 201, "Test customer created successfully", {
        customerId: customer._id,
        firebaseUid: TEST_UID,
        phoneNumber: phoneNumber,
        customToken: customToken,
        note: "Use this custom token to authenticate as this test user in Firebase",
      });
    } catch (createError) {
      // Handle duplicate key errors
      if (createError.code === 11000) {
        return sendError(
          res,
          409,
          "Customer record already exists with this phone number or Firebase UID",
          {
            error: "DUPLICATE_CUSTOMER",
          }
        );
      }

      // Handle validation errors
      if (createError.name === "ValidationError") {
        const validationErrors = Object.values(createError.errors).map(
          (err) => err.message
        );
        return sendError(res, 400, "Validation failed", {
          error: "VALIDATION_ERROR",
          details: validationErrors,
        });
      }

      throw createError;
    }
  } catch (error) {
    console.error("Error in createTestCustomer:", error);
    return sendError(
      res,
      500,
      "Failed to create test customer",
      process.env.NODE_ENV === "development"
        ? { error: error.message }
        : undefined
    );
  }
};

/**
 * Get comprehensive customer profile data
 * @description Returns full profile details including orders, addresses, vouchers, and subscriptions
 * @route GET /api/auth/customer/profile
 * @access Protected (Firebase Token Required)
 * @param {import('express').Request} req - Express request object
 * @param {Object} req.firebaseUser - Firebase user data from middleware
 * @param {string} req.firebaseUser.uid - Firebase user ID
 * @param {string} req.firebaseUser.phoneNumber - User's phone number
 * @param {import('express').Response} res - Express response object
 * @returns {Object} Comprehensive profile data with orders, vouchers, and subscriptions
 */
export const getCustomerProfile = async (req, res) => {
  try {
    console.log("\n=== getCustomerProfile START ===");

    // Extract Firebase user data from middleware
    const { uid, phoneNumber } = req.firebaseUser;
    console.log("> Firebase UID:", uid);
    console.log("> Phone Number:", phoneNumber);

    // Validate that we have user identification
    if (!uid && !phoneNumber) {
      return sendError(res, 400, "User identification not found in token", {
        error: "MISSING_USER_IDENTIFICATION",
      });
    }

    // Build query to find customer
    const query = {
      isDeleted: false,
    };

    if (uid) {
      query.firebaseUid = uid;
    } else if (phoneNumber) {
      query.phone = phoneNumber;
    }

    // Fetch customer profile
    console.log("> Step 1: Fetching customer profile...");
    const customer = await Customer.findOne(query)
      .select("-__v")
      .lean();

    if (!customer) {
      return sendError(res, 404, "Customer profile not found", {
        error: "CUSTOMER_NOT_FOUND",
      });
    }

    console.log("> Customer ID:", customer._id);

    // Fetch past orders (limited to last 50 orders, sorted by date)
    console.log("> Step 2: Fetching past orders...");
    const orders = await Order.find({
      customerId: customer._id,
      isDeleted: false,
    })
      .select("-__v")
      .populate("menuItem.menuItemId", "name description price category")
      .populate("addons.addonId", "name description price")
      .populate("subscriptionUsed", "planId status")
      .sort({ scheduledForDate: -1 })
      .limit(50)
      .lean();

    console.log("> Orders found:", orders.length);

    // Calculate order statistics
    const orderStats = {
      totalOrders: orders.length,
      completedOrders: orders.filter((order) => order.orderStatus.deliveredAt)
        .length,
      cancelledOrders: orders.filter((order) => order.orderStatus.cancelledAt)
        .length,
      pendingOrders: orders.filter(
        (order) =>
          !order.orderStatus.deliveredAt &&
          !order.orderStatus.cancelledAt &&
          !order.orderStatus.failedAt
      ).length,
    };

    // Fetch all subscriptions (active and past)
    console.log("> Step 3: Fetching subscriptions...");
    const subscriptions = await Subscription.find({
      customerId: customer._id,
      isDeleted: false,
    })
      .select("-__v")
      .populate("planId", "planName days planType totalVouchers planPrice description")
      .sort({ purchaseDate: -1 })
      .lean();

    console.log("> Subscriptions found:", subscriptions.length);

    // Calculate subscription statistics
    const subscriptionStats = {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: subscriptions.filter((sub) => sub.status === "ACTIVE")
        .length,
      expiredSubscriptions: subscriptions.filter((sub) => sub.status === "EXPIRED")
        .length,
      cancelledSubscriptions: subscriptions.filter(
        (sub) => sub.status === "CANCELLED"
      ).length,
    };

    // Fetch vouchers for all subscriptions
    console.log("> Step 4: Fetching vouchers...");
    const vouchers = await Voucher.find({
      customerId: customer._id,
      isDeleted: false,
    })
      .select("-__v")
      .populate("subscriptionId", "planId status")
      .sort({ expiryDate: 1 })
      .lean();

    console.log("> Vouchers found:", vouchers.length);

    // Calculate voucher statistics
    const voucherStats = {
      totalVouchers: vouchers.reduce(
        (sum, voucher) => sum + voucher.totalVouchers,
        0
      ),
      remainingVouchers: vouchers.reduce(
        (sum, voucher) =>
          sum + (voucher.isExpired ? 0 : voucher.remainingVouchers),
        0
      ),
      usedVouchers: vouchers.reduce(
        (sum, voucher) =>
          sum + (voucher.totalVouchers - voucher.remainingVouchers),
        0
      ),
      expiredVouchers: vouchers.filter((voucher) => voucher.isExpired).length,
      activeVoucherBatches: vouchers.filter(
        (voucher) => !voucher.isExpired && voucher.remainingVouchers > 0
      ).length,
    };

    // Structure the response data
    const profileData = {
      // Basic profile information
      profile: {
        customerId: customer._id,
        name: customer.name || null,
        email: customer.email || null,
        phone: customer.phone || null,
        firebaseUid: customer.firebaseUid,
        isProfileComplete: customer.isProfileComplete,
        autoOrder: customer.autoOrder,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },

      // Address information
      address: customer.address
        ? {
            addressLine: customer.address.addressLine || null,
            dontRingBell: customer.address.dontRingBell || false,
            dontCall: customer.address.dontCall || false,
            deliveryNote: customer.address.deliveryNote || "",
          }
        : null,

      // Dietary preferences
      dietaryPreferences: customer.dietaryPreferences
        ? {
            foodType: customer.dietaryPreferences.foodType || "VEG",
            eggiterian: customer.dietaryPreferences.eggiterian || false,
            jainFriendly: customer.dietaryPreferences.jainFriendly || false,
            dabbaType: customer.dietaryPreferences.dabbaType || "DISPOSABLE",
            spiceLevel: customer.dietaryPreferences.spiceLevel || "MEDIUM",
          }
        : null,

      // Active subscription status
      activeSubscription: customer.activeSubscription
        ? {
            hasActiveSubscription: customer.activeSubscription.status || false,
            subscriptionId: customer.activeSubscription.subscriptionId || null,
          }
        : {
            hasActiveSubscription: false,
            subscriptionId: null,
          },

      // Order statistics and recent orders
      orders: {
        statistics: orderStats,
        recentOrders: orders.slice(0, 10), // Return last 10 orders in detail
        allOrdersCount: orders.length,
      },

      // Subscription information
      subscriptions: {
        statistics: subscriptionStats,
        allSubscriptions: subscriptions,
      },

      // Voucher information
      vouchers: {
        statistics: voucherStats,
        allVouchers: vouchers,
      },
    };

    console.log("> Step 5: Profile data compiled successfully");
    console.log("=== getCustomerProfile END (SUCCESS) ===\n");

    return sendSuccess(
      res,
      200,
      "Customer profile retrieved successfully",
      profileData
    );
  } catch (error) {
    console.error("\n!!! ERROR in getCustomerProfile !!!");
    console.error("> Error name:", error.name);
    console.error("> Error message:", error.message);
    console.error("> Error stack:", error.stack);
    console.error("=== getCustomerProfile END (ERROR) ===\n");

    return sendError(
      res,
      500,
      "Failed to retrieve customer profile",
      process.env.NODE_ENV === "development"
        ? { error: error.message, stack: error.stack }
        : undefined
    );
  }
};
