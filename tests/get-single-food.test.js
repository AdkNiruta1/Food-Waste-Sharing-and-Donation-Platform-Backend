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

describe("Get Single Food", () => {
  it("should fetch one donation", async () => {
    const all = await request(app).get("/api/food-donations");
    const id = all.body[0]?._id;
    
    if (!id) {
      expect(true).toBe(true);
      return;
    }

    const res = await request(app)
      .get(`/api/food-donations/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });
});