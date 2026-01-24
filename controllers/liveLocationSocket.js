import { WebSocketServer } from "ws";
import FoodPost from "../models/foodPostModel.js";
import User from "../models/userModel.js";

// foodPostId => { receiverId, lat, lng, lastUpdated, donorId }
const liveLocations = {};

// ws => { userId, role, foodPostId }
const clientsMap = new Map();

const LOCATION_TTL = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
  const now = Date.now();
  for (const postId in liveLocations) {
    if (now - liveLocations[postId].lastUpdated > LOCATION_TTL) {
      delete liveLocations[postId];
    }
  }
}, 60 * 1000);

export const setupLiveLocationSocket = (server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("WS client connected");

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message);
        const { userId, role, foodPostId, lat, lng } = data;

        // FIRST MESSAGE = REGISTER CLIENT
        if (!clientsMap.has(ws)) {
          // Validate once
          const user = await User.findById(userId);
          if (!user) {
            ws.send(JSON.stringify({ error: "Unauthorized" }));
            return;
          }

          const foodPost = await FoodPost.findById(foodPostId);
          if (!foodPost) {
            ws.send(JSON.stringify({ error: "Invalid food post" }));
            return;
          }

          clientsMap.set(ws, { userId, role, foodPostId });

          ws.send(JSON.stringify({ type: "REGISTERED" }));
          console.log(`Registered ${role}: ${userId} for post ${foodPostId}`);
        }

        // HANDLE RECIPIENT LIVE LOCATION
        if (role === "recipient" && lat && lng) {
          const foodPost = await FoodPost.findById(foodPostId);

          liveLocations[foodPostId] = {
            receiverId: userId,
            lat,
            lng,
            lastUpdated: Date.now(),
            donorId: foodPost.donor.toString(),
          };

          // Broadcast to donor watching THIS foodPost
          wss.clients.forEach((client) => {
            const clientInfo = clientsMap.get(client);

            if (
              client.readyState === client.OPEN &&
              clientInfo &&
              clientInfo.role === "donor" &&
              clientInfo.foodPostId === foodPostId
            ) {
              client.send(JSON.stringify({
                type: "LIVE_LOCATION",
                foodPostId,
                lat,
                lng,
                receiverId: userId,
              }));
            }
          });
        }

      } catch (err) {
        console.error("WebSocket error:", err);
        ws.send(JSON.stringify({ error: "Invalid data format" }));
      }
    });

    ws.on("close", () => {
      clientsMap.delete(ws);
      console.log("WS client disconnected");
    });
  });

  console.log("✅ Live Location WebSocket server running!");
  return wss;
};
