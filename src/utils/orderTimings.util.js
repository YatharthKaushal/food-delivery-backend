import { MEAL_TIME_LIMITS } from '../constants/timings.js';

export const canPlaceOrder = (mealType, scheduledForDate) => {
  const now = new Date();
  const scheduledDate = new Date(scheduledForDate);
  const currentHour = now.getHours();

  // If ordering for today, check time restrictions
  if (scheduledDate.toDateString() === now.toDateString()) {
    if (mealType === 'LUNCH' && currentHour >= MEAL_TIME_LIMITS.LUNCH_CUTOFF_HOUR) {
      return { allowed: false, reason: 'Cannot place lunch orders after 11 AM' };
    }
    if (mealType === 'DINNER' && currentHour >= MEAL_TIME_LIMITS.DINNER_CUTOFF_HOUR) {
      return { allowed: false, reason: 'Cannot place dinner orders after 7 PM' };
    }
  }

  return { allowed: true };
};

export const canCancelOrder = (order) => {
  const now = new Date();
  const scheduledDate = new Date(order.scheduledForDate);
  const currentHour = now.getHours();

  // Cannot cancel past orders
  if (scheduledDate < now) {
    return { allowed: false, reason: 'Cannot cancel past orders' };
  }

  // If order is for today, check time restrictions
  if (scheduledDate.toDateString() === now.toDateString()) {
    if (order.mealType === 'LUNCH' && currentHour >= MEAL_TIME_LIMITS.LUNCH_CUTOFF_HOUR) {
      return { allowed: false, reason: 'Cannot cancel lunch orders after 11 AM' };
    }
    if (order.mealType === 'DINNER' && currentHour >= MEAL_TIME_LIMITS.DINNER_CUTOFF_HOUR) {
      return { allowed: false, reason: 'Cannot cancel dinner orders after 7 PM' };
    }
  }

  return { allowed: true };
};
