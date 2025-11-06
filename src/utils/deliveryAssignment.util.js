import DeliveryDriver from "../schema/DeliveryDriver.schema.js";
import Order from "../schema/Order.schema.js";

/**
 * Find available drivers near the restaurant location
 * Simple algorithm: Find drivers who are available and not on delivery
 * @param {Object} restaurantLocation - Restaurant coordinates (optional for now)
 * @returns {Promise<Object|null>} Available driver or null
 */
export const findAvailableDriver = async (restaurantLocation) => {
  try {
    // Find drivers who are:
    // 1. Active
    // 2. Currently available (not on delivery)
    // 3. Within reasonable distance (if location tracking implemented)

    const availableDriver = await DeliveryDriver.findOne({
      isActive: true,
      availabilityStatus: "AVAILABLE",
      isAvailable: true,
      isDeleted: false,
      // TODO: Add geospatial query when location tracking is fully implemented
      // "currentLocation.latitude": { $exists: true },
      // "currentLocation.longitude": { $exists: true },
    }).sort({ lastDeliveryAt: 1 }); // Prioritize drivers with oldest last delivery

    return availableDriver;
  } catch (error) {
    console.error("Driver search error:", error);
    return null;
  }
};

/**
 * Assign driver to order
 * @param {string} orderId - Order ID
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object|null>} Updated order or null
 */
export const assignDriverToOrder = async (orderId, driverId) => {
  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          driverId,
          assignedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!order) {
      return null;
    }

    // Update driver status
    await DeliveryDriver.findByIdAndUpdate(driverId, {
      $set: {
        isAvailable: false,
        availabilityStatus: "BUSY",
        currentOrderId: orderId,
      },
    });

    return order;
  } catch (error) {
    console.error("Driver assignment error:", error);
    return null;
  }
};

/**
 * Calculate estimated delivery time
 * Simple calculation: base time + distance factor
 * @param {number} distance - Distance in kilometers
 * @returns {number} Estimated time in minutes
 */
export const calculateETA = (distance = 0) => {
  const baseTime = 20; // 20 minutes base
  const timePerKm = 3; // 3 minutes per km
  return baseTime + distance * timePerKm;
};

/**
 * Release driver from current order
 * Makes driver available for new assignments
 * @param {string} driverId - Driver ID
 * @returns {Promise<boolean>} Success status
 */
export const releaseDriver = async (driverId) => {
  try {
    await DeliveryDriver.findByIdAndUpdate(driverId, {
      $set: {
        isAvailable: true,
        availabilityStatus: "AVAILABLE",
        lastDeliveryAt: new Date(),
      },
      $unset: { currentOrderId: "" },
    });
    return true;
  } catch (error) {
    console.error("Driver release error:", error);
    return false;
  }
};
