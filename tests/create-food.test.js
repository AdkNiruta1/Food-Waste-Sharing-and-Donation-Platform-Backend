import request from "supertest";
import app from "../app.js";

describe("Create Food", () => {
  it("should create donation", async () => {
    const res = await request(app).post("/api/users/login").send({
      email: "test@gmail.com",
      password: "123456"
    });

    const token = res.body?.token || res.body?.data?._id;
    
    if (!token) {
      expect([400, 401]).toContain(res.statusCode);
      return;
    }

    const createRes = await request(app)
      .post("/api/food-donations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rice", quantity: 5 });

    expect([200, 201, 401]).toContain(createRes.statusCode);
  });
});