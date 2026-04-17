import request from "supertest";
import app from "../app.js";

describe("Get All Foods", () => {
  it("should fetch all donations", async () => {
    const res = await request(app).get("/api/food-donations/");

    expect(res.statusCode).toBe(200);
  });
});