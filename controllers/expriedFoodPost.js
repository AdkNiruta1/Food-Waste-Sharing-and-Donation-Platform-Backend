import cron from "node-cron";
import FoodPost from "../models/foodPostModel.js";

// Runs every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();

    // Find all food posts that are still available but have expired
    const expiredPosts = await FoodPost.find({
      status: "available",
      expiryDate: { $lte: now },
    }).populate("donor", "_id"); // get donor id for notification

    if (expiredPosts.length === 0) return;

    // Update their status to expired
    const postIds = expiredPosts.map(post => post._id);
    await FoodPost.updateMany(
      { _id: { $in: postIds } },
      { status: "expired" }
    );

    // Send notification to donors
    console.log(`Expired ${expiredPosts.length} food posts and notified donors.`);

  } catch (err) {
    console.error("Error in auto-expiring food posts:", err);
  }
});
