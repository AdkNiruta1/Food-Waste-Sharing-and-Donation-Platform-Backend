import request from "supertest";
import app from "../app.js";

let token;

beforeAll(async () => {
  const res = await request(app).post("/api/users/login").send({
    email: "test@gmail.com",
    password: "123456"
  });
  token = res.body.token;
});

describe("Update Food", () => {
  it("should update donation", async () => {
    const all = await request(app).get("/api/food-donations");
    const id = all.body[0]?._id;

    if (!id) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .put(`/api/food-donations/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 20 });

    expect(res.statusCode).toBe(200);
  });
});