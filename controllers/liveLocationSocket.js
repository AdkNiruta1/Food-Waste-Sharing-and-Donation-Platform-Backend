import { WebSocketServer } from "ws";
import FoodPost from "../models/foodPostModel.js";
import User from "../models/userModel.js";

// In-memory storage for live locations
// { foodPostId: { receiverId, lat, lng, lastUpdated, donorId } }
const liveLocations = {};

// TTL for cleanup (ms)
const LOCATION_TTL = 10 * 60 * 1000; // 10 minutes

// Cleanup function to remove expired locations
setInterval(() => {
  const now = Date.now();
  for (const postId in liveLocations) {
    if (now - liveLocations[postId].lastUpdated > LOCATION_TTL) {
      delete liveLocations[postId];
    }
  }
}, 60 * 1000); // run every 1 min

export const setupLiveLocationSocket = (server) => {
  const wss = new WebSocketServer({ server });

  // Map of clients to track who belongs to which food post
  const clientsMap = new Map();

  wss.on("connection", async (ws, req) => {
    // You can implement session or token authentication
    // Example: ws must send { userId, role, foodPostId } on first message
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message);

        const { userId, role, foodPostId, lat, lng } = data;

        // Validate user
        const user = await User.findById(userId);
        if (!user) return ws.send(JSON.stringify({ error: "Unauthorized" }));

        // Validate food post
        const foodPost = await FoodPost.findById(foodPostId);
        if (!foodPost) return ws.send(JSON.stringify({ error: "Invalid food post" }));

        if (role === "recipient") {
          // Only allow receiver to send location
          if (foodPost.requests.includes(userId) === false) {
            return ws.send(JSON.stringify({ error: "You are not authorized for this post" }));
          }

          // Save live location in memory
          liveLocations[foodPostId] = {
            receiverId: userId,
            lat,
            lng,
            lastUpdated: Date.now(),
            donorId: foodPost.donor.toString(),
          };

          // Broadcast to the donor only
          wss.clients.forEach((client) => {
            if (client.readyState === ws.OPEN && clientsMap.get(client) === foodPost.donor.toString()) {
              client.send(JSON.stringify({
                foodPostId,
                lat,
                lng,
                receiverId: userId,
              }));
            }
          });
        } else if (role === "donor") {
          // Register this donor client to the foodPost room
          clientsMap.set(ws, userId); // userId of donor
        }
      } catch (err) {
        console.error("WebSocket error:", err);
        ws.send(JSON.stringify({ error: "Invalid data format" }));
      }
    });

    ws.on("close", () => {
      clientsMap.delete(ws);
    });
  });

  console.log("Live Location WebSocket server running!");
  return wss;
};
