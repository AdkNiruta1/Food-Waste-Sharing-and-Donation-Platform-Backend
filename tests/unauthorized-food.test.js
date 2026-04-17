import request from "supertest";
import app from "../app.js";

describe("Unauthorized Food", () => {
  it("should fail without token", async () => {
    const res = await request(app)
      .post("/api/food-donations")
      .send({ name: "Rice" });

    expect(res.statusCode).toBe(401);
  });
});