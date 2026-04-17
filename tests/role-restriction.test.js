import request from "supertest";
import app from "../app.js";

describe("Role Restriction", () => {
  it("should block invalid token", async () => {
    const res = await request(app)
      .post("/api/food-donations")
      .set("Authorization", "Bearer invalidtoken")
      .send({ name: "Food" });

    expect(res.statusCode).toBe(401);
  });
});