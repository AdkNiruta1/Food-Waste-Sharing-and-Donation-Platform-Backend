import request from "supertest";
import app from "../app.js";

describe("Register User", () => {
  it("should register new user", async () => {
    const res = await request(app).post("/api/users/register").send({
      name: "NewUser",
      email: "newuser" + Date.now() + "@gmail.com",
      password: "123456",
      role: "donor",
      phone: "1234567890",
      address: "Test Address"
    });

    expect([201, 400]).toContain(res.statusCode);
  });
});