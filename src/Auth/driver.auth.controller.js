import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import DeliveryDriver from "../schema/DeliveryDriver.schema.js";
import { sendSuccess, sendError } from "../utils/response.util.js";

/**
 * Register a new delivery driver
 * @route POST /api/auth/delivery-driver/register
 * @access Public
 */
export const registerDriver = async (req, res) => {
  try {
    const { name, username, password, email, phone } = req.body;

    // Validate required fields
    if (!name || !username || !password) {
      return sendError(
        res,
        400,
        "Name, username, and password are required fields"
      );
    }

    // Check if username already exists
    const existingDriver = await DeliveryDriver.findOne({
      username: username.toLowerCase(),
      isDeleted: false,
    });

    if (existingDriver) {
      return sendError(
        res,
        409,
        "Username already exists. Please choose a different username"
      );
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await DeliveryDriver.findOne({
        email: email.toLowerCase(),
        isDeleted: false,
      });

      if (existingEmail) {
        return sendError(
          res,
          409,
          "Email already registered. Please use a different email"
        );
      }
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await DeliveryDriver.findOne({
        phone: phone,
        isDeleted: false,
      });

      if (existingPhone) {
        return sendError(
          res,
          409,
          "Phone number already registered. Please use a different phone number"
        );
      }
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new delivery driver
    const newDriver = new DeliveryDriver({
      name,
      username: username.toLowerCase(),
      password: hashedPassword,
      email: email ? email.toLowerCase() : undefined,
      phone,
    });

    // Save to database
    await newDriver.save();

    // Return success response (exclude password)
    return sendSuccess(res, 201, "Delivery driver registered successfully", {
      driver: {
        id: newDriver._id,
        name: newDriver.name,
        username: newDriver.username,
        email: newDriver.email,
        phone: newDriver.phone,
        createdAt: newDriver.createdAt,
      },
    });
  } catch (error) {
    console.error("Driver registration error:", error);

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
        409,
        `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      );
    }

    return sendError(
      res,
      500,
      "Failed to register delivery driver. Please try again"
    );
  }
};

/**
 * Login delivery driver
 * @route POST /api/auth/delivery-driver/login
 * @access Public
 */
export const loginDriver = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return sendError(res, 400, "Username and password are required");
    }

    // Find driver by username (include password field for verification)
    const driver = await DeliveryDriver.findOne({
      username: username.toLowerCase(),
      isDeleted: false,
    }).select("+password");

    if (!driver) {
      return sendError(res, 401, "Invalid username or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, driver.password);

    if (!isPasswordValid) {
      return sendError(res, 401, "Invalid username or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: driver._id,
        username: driver.username,
        type: "driver",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d", // Token expires in 7 days
      }
    );

    // Return success response with token
    return sendSuccess(res, 200, "Login successful", {
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        username: driver.username,
        email: driver.email,
        phone: driver.phone,
        availabilityStatus: driver.availabilityStatus,
        rating: driver.rating,
      },
    });
  } catch (error) {
    console.error("Driver login error:", error);
    return sendError(res, 500, "Failed to login. Please try again");
  }
};

/**
 * Complete delivery driver onboarding by updating profile
 * @route PUT /api/auth/delivery-driver/onboarding
 * @access Protected (JWT Token Required)
 */
export const onBoardingUser = async (req, res) => {
  try {
    // Extract driver data from middleware (JWT token)
    const { id } = req.user;

    // Extract and validate request body
    const { govId, vehicle } = req.body;

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
    const validVehicleTypes = ["TWO WHEELER", "FOUR WHEELER"];
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

    // Find driver by ID
    const driver = await DeliveryDriver.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!driver) {
      return sendError(res, 404, "Driver profile not found");
    }

    // Prepare update data
    const updateData = {
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

    // Update driver profile
    try {
      const updatedDriver = await DeliveryDriver.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: updateData },
        {
          new: true,
          runValidators: true,
        }
      );

      console.log(`> Driver profile updated for ID: ${id}`);

      return sendSuccess(res, 200, "Profile updated successfully", {
        driverId: updatedDriver._id,
        name: updatedDriver.name,
        phone: updatedDriver.phone,
        vehicle: updatedDriver.vehicle,
        govId: updatedDriver.govId,
        availabilityStatus: updatedDriver.availabilityStatus,
      });
    } catch (updateError) {
      // Handle duplicate vehicle number error
      if (updateError.code === 11000) {
        const field = Object.keys(updateError.keyPattern)[0];
        let message = "This information is already registered";

        if (field === "vehicle.vehicleNumber") {
          message =
            "This vehicle number is already registered with another driver";
        } else if (field === "govId.idNumber") {
          message =
            "This government ID is already registered with another driver";
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
