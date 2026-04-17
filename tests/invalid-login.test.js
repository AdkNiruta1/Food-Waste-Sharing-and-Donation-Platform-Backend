import request from "supertest";
import app from "../app.js";

describe("Invalid Login", () => {
  it("should fail with wrong password", async () => {
    const res = await request(app).post("/api/users/login").send({
      email: "test@gmail.com",
      password: "wrong"
    });

    expect([400, 401]).toContain(res.statusCode);
  });
});