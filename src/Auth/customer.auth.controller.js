import Customer from "../schema/Customer.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import { firebaseAdmin } from "../config/firebase.config.js";

/**
 * Get customer profile completion status
 * @route GET /api/auth/customer/status
 * @access Protected (Firebase Token Required)
 */
export const getIsProfileComplete = async (req, res) => {
  try {
    // Extract Firebase user data from middleware
    const { uid, phoneNumber } = req.firebaseUser;

    // Validate that we have either uid or phone number
    if (!uid && !phoneNumber) {
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

    // Check if customer profile exists
    let customer = await Customer.findOne(query);

    // If customer doesn't exist, create a new record
    if (!customer) {
      try {
        customer = await Customer.create({
          phone: phoneNumber || null,
          firebaseUid: uid,
          isProfileComplete: false,
        });

        console.log(`> New customer record created for UID: ${uid}`);

        return sendSuccess(res, 201, "Customer profile created successfully", {
          isProfileComplete: false,
          customerId: customer._id,
          isNewUser: true,
        });
      } catch (createError) {
        // Handle duplicate key errors
        if (createError.code === 11000) {
          return sendError(
            res,
            409,
            "Customer profile already exists with this phone number or Firebase UID",
            {
              error: "DUPLICATE_CUSTOMER",
            }
          );
        }
        throw createError;
      }
    }

    // Return existing customer's profile completion status
    return sendSuccess(res, 200, "Profile status retrieved successfully", {
      isProfileComplete: customer.isProfileComplete,
      customerId: customer._id,
      isNewUser: false,
      hasName: !!customer.name,
      hasDietaryPreferences: !!customer.dietaryPreferences?.foodType,
    });
  } catch (error) {
    console.error("Error in getIsProfileComplete:", error);
    return sendError(
      res,
      500,
      "Failed to retrieve profile status",
      process.env.NODE_ENV === "development"
        ? { error: error.message }
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
