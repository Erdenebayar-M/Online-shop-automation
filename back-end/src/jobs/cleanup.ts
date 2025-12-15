import { cleanupExpiredReservations } from "../services/inventory.service";
import { markExpiredSubscriptions } from "../services/subscription.service";

/**
 * Initialize all background cleanup jobs
 */
export function initializeCleanupJobs() {
  console.log("Initializing cleanup jobs...");

  // Clean up expired reservations every minute
  setInterval(async () => {
    try {
      await cleanupExpiredReservations();
    } catch (error) {
      console.error("Error in reservation cleanup job:", error);
    }
  }, 60 * 1000); // Every 1 minute

  // Mark expired subscriptions every hour
  setInterval(async () => {
    try {
      await markExpiredSubscriptions();
    } catch (error) {
      console.error("Error in subscription cleanup job:", error);
    }
  }, 60 * 60 * 1000); // Every 1 hour

  // Run immediately on startup
  cleanupExpiredReservations().catch((err) =>
    console.error("Initial reservation cleanup failed:", err)
  );
  markExpiredSubscriptions().catch((err) =>
    console.error("Initial subscription cleanup failed:", err)
  );

  console.log("Cleanup jobs initialized successfully");
}
