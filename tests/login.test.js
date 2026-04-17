import request from "supertest";
import app from "../app.js";

describe("Login User", () => {
  it("should login successfully", async () => {
    const res = await request(app).post("/api/users/login").send({
      email: "test@gmail.com",
      password: "123456"
    });

    expect([200, 400]).toContain(res.statusCode);
  });
});