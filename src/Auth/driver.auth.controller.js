import DeliveryDriver from "../schema/DeliveryDriver.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";
import { firebaseAdmin } from "../config/firebase.config.js";

/**
 * Get delivery driver profile completion status
 * @route GET /api/auth/delivery-driver/status
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

    // Build query to find driver by firebaseUid or phone
    const query = {
      isDeleted: false,
    };

    if (uid) {
      query.firebaseUid = uid;
    } else if (phoneNumber) {
      query.phone = phoneNumber;
    }

    // Check if driver profile exists
    let driver = await DeliveryDriver.findOne(query);

    // If driver doesn't exist, create a new record
    if (!driver) {
      try {
        driver = await DeliveryDriver.create({
          phone: phoneNumber || null,
          firebaseUid: uid,
          isProfileComplete: false,
        });

        console.log(`> New delivery driver record created for UID: ${uid}`);

        return sendSuccess(
          res,
          201,
          "Driver profile created successfully",
          {
            isProfileComplete: false,
            driverId: driver._id,
            isNewUser: true,
          }
        );
      } catch (createError) {
        // Handle duplicate key errors
        if (createError.code === 11000) {
          return sendError(
            res,
            409,
            "Driver profile already exists with this phone number or Firebase UID",
            {
              error: "DUPLICATE_DRIVER",
            }
          );
        }
        throw createError;
      }
    }

    // Return existing driver's profile completion status
    return sendSuccess(res, 200, "Profile status retrieved successfully", {
      isProfileComplete: driver.isProfileComplete,
      driverId: driver._id,
      isNewUser: false,
      hasName: !!driver.name,
      hasVehicleInfo: !!driver.vehicle?.vehicleType,
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
 * Complete delivery driver onboarding by updating profile
 * @route PUT /api/auth/delivery-driver/onboarding
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
    const { name, govId, vehicle } = req.body;

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

    // Validate vehicle information
    if (!vehicle || !vehicle.vehicleType || !vehicle.vehicleNumber) {
      return sendError(
        res,
        400,
        "Vehicle information (type and number) is required for onboarding",
        { error: "MISSING_VEHICLE_INFO" }
      );
    }

    // Validate vehicle type enum
    const validVehicleTypes = ["BIKE", "SCOOTER", "CAR", "VAN"];
    if (!validVehicleTypes.includes(vehicle.vehicleType.toUpperCase())) {
      return sendError(res, 400, "Invalid vehicle type", {
        error: "INVALID_VEHICLE_TYPE",
        allowedValues: validVehicleTypes,
      });
    }

    // Validate vehicle number format (basic check)
    const vehicleNumberRegex = /^[A-Z0-9\s-]{5,15}$/i;
    if (!vehicleNumberRegex.test(vehicle.vehicleNumber.trim())) {
      return sendError(
        res,
        400,
        "Please provide a valid vehicle registration number",
        {
          error: "INVALID_VEHICLE_NUMBER_FORMAT",
        }
      );
    }

    // Build query to find driver
    const query = {
      isDeleted: false,
    };

    if (uid) {
      query.firebaseUid = uid;
    } else if (phoneNumber) {
      query.phone = phoneNumber;
    }

    // Check if driver profile exists
    let driver = await DeliveryDriver.findOne(query);

    if (!driver) {
      return sendError(
        res,
        404,
        "Driver profile not found. Please check profile status first",
        {
          error: "DRIVER_NOT_FOUND",
        }
      );
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      vehicle: {
        vehicleType: vehicle.vehicleType.toUpperCase(),
        vehicleNumber: vehicle.vehicleNumber.toUpperCase().trim(),
        documents: vehicle.documents || [],
      },
    };

    // Add government ID if provided
    if (govId) {
      updateData.govId = {
        ...driver.govId,
      };
      if (govId.idNumber) {
        updateData.govId.idNumber = govId.idNumber.toUpperCase().trim();
      }
      if (govId.picture) {
        updateData.govId.picture = govId.picture.trim();
      }
    }

    // Set isProfileComplete to true if we have name and vehicle info
    const hasVehicleInfo =
      vehicle?.vehicleType && vehicle?.vehicleNumber;

    if (name && hasVehicleInfo) {
      updateData.isProfileComplete = true;
    }

    // Update driver profile
    try {
      driver = await DeliveryDriver.findOneAndUpdate(
        query,
        { $set: updateData },
        {
          new: true,
          runValidators: true,
        }
      );

      console.log(`> Driver profile updated for UID: ${uid}`);

      return sendSuccess(res, 200, "Profile updated successfully", {
        driverId: driver._id,
        isProfileComplete: driver.isProfileComplete,
        name: driver.name,
        phone: driver.phone,
        vehicle: driver.vehicle,
        govId: driver.govId,
        availabilityStatus: driver.availabilityStatus,
      });
    } catch (updateError) {
      // Handle duplicate vehicle number error
      if (updateError.code === 11000) {
        const field = Object.keys(updateError.keyPattern)[0];
        let message = "This information is already registered";

        if (field === "vehicle.vehicleNumber") {
          message = "This vehicle number is already registered with another driver";
        } else if (field === "govId.idNumber") {
          message = "This government ID is already registered with another driver";
        }

        return sendError(res, 409, message, {
          error: "DUPLICATE_ENTRY",
        });
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
      "Failed to update driver profile",
      process.env.NODE_ENV === "development"
        ? { error: error.message }
        : undefined
    );
  }
};

/**
 * Create a test delivery driver for development/testing purposes
 * @route POST /api/auth/delivery-driver/create-test
 * @access Protected (Admin Only)
 */
export const createTestDriver = async (req, res) => {
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
    const TEST_UID = `test-driver-${phoneNumber}`;

    // Check if test driver already exists
    const existingDriver = await DeliveryDriver.findOne({
      $or: [
        { phone: phoneNumber, isDeleted: false },
        { firebaseUid: TEST_UID, isDeleted: false },
      ],
    });

    if (existingDriver) {
      return sendError(
        res,
        409,
        "Test driver already exists with this phone number",
        {
          error: "DUPLICATE_TEST_DRIVER",
          driverId: existingDriver._id,
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

    // Create driver record in database
    let driver;
    try {
      driver = await DeliveryDriver.create({
        phone: phoneNumber,
        firebaseUid: TEST_UID,
        isProfileComplete: false,
        name: `Test Driver ${phoneNumber}`,
      });

      console.log(`> Test delivery driver created with UID: ${TEST_UID}`);

      return sendSuccess(res, 201, "Test driver created successfully", {
        driverId: driver._id,
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
          "Driver record already exists with this phone number or Firebase UID",
          {
            error: "DUPLICATE_DRIVER",
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
    console.error("Error in createTestDriver:", error);
    return sendError(
      res,
      500,
      "Failed to create test driver",
      process.env.NODE_ENV === "development"
        ? { error: error.message }
        : undefined
    );
  }
};
