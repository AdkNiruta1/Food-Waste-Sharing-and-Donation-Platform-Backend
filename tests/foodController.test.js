import { jest } from "@jest/globals";

/* ================= MOCKS (MUST BE FIRST) ================= */

const sendResponseMock = jest.fn();
const saveCompressedImageMock = jest.fn();

/* ---- MOCK MODULES ---- */

jest.unstable_mockModule("../utils/responseHandler.js", () => ({
  sendResponse: sendResponseMock,
}));

jest.unstable_mockModule("../utils/saveImage.js", () => ({
  saveCompressedImage: saveCompressedImageMock,
}));

jest.unstable_mockModule("../models/foodPostModel.js", () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/foodRequestModel.js", () => ({
  default: {
    findById: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.unstable_mockModule("../controllers/notificationController.js", () => ({
  createNotification: jest.fn(),
}));

jest.unstable_mockModule("../utils/logger.js", () => ({
  logActivity: jest.fn(),
}));

/* ================= IMPORT AFTER MOCK ================= */

const {
  createFoodDonation,
  getAllFoodDonations,
  getMyDonations,
  requestFood,
  acceptFoodRequest,
  rejectedFoodRequest,
  deleteFoodDonation,
} = await import("../controllers/foodDonationsController.js");

const FoodPost = (await import("../models/foodPostModel.js")).default;
const FoodRequest = (await import("../models/foodRequestModel.js")).default;

/* ================= RESET ================= */

beforeEach(() => {
  jest.clearAllMocks();
});

/* ================= MOCK RES ================= */

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

/* ================= TESTS ================= */

// CREATE
describe("createFoodDonation", () => {
  test("401 if not logged in", async () => {
    await createFoodDonation({ session: {}, body: {}, files: {} }, mockRes());
    expect(sendResponseMock).toHaveBeenCalled();
  });

  test("400 if no file", async () => {
    await createFoodDonation(
      { session: { userId: "1" }, body: {}, files: {} },
      mockRes()
    );
    expect(sendResponseMock).toHaveBeenCalled();
  });

  test("success create donation", async () => {
    saveCompressedImageMock.mockResolvedValue("img.jpg");
    FoodPost.create.mockResolvedValue({ _id: "1" });

    await createFoodDonation(
      {
        session: { userId: "1" },
        body: {
          title: "food",
          description: "desc",
          type: "veg",
          quantity: 2,
          unit: "kg",
          expiryDate: "2026-01-01",
          district: "ktm",
          city: "ktm",
        },
        files: { photo: [{ buffer: Buffer.from("x") }] },
      },
      mockRes()
    );

    expect(FoodPost.create).toHaveBeenCalled();
  });
});

// GET ALL
describe("getAllFoodDonations", () => {
  test("returns list", async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ _id: "1" }]),
    };

    FoodPost.find.mockReturnValue(chain);
    FoodPost.countDocuments.mockResolvedValue(1);

    await getAllFoodDonations({ query: { page: 1, limit: 10 } }, mockRes());

    expect(sendResponseMock).toHaveBeenCalled();
  });
});

// MY DONATIONS
describe("getMyDonations", () => {
  test("not logged in", async () => {
    await getMyDonations({ session: {} }, mockRes());
    expect(sendResponseMock).toHaveBeenCalled();
  });

  test("success", async () => {
    FoodPost.find.mockResolvedValue([]);
    await getMyDonations({ session: { userId: "1" } }, mockRes());
    expect(sendResponseMock).toHaveBeenCalled();
  });
});

// REQUEST FOOD
describe("requestFood", () => {
  test("create request", async () => {
    FoodPost.findById.mockResolvedValue({
      _id: "f1",
      donor: "d1",
      status: "available",
    });

    FoodRequest.create.mockResolvedValue({ _id: "r1" });

    await requestFood(
      { session: { userId: "u1" }, body: { foodPostId: "f1" } },
      mockRes()
    );

    expect(FoodRequest.create).toHaveBeenCalled();
  });
});

// ACCEPT
describe("acceptFoodRequest", () => {
  test("accept request", async () => {
    const save = jest.fn();

    FoodRequest.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "r1",
        foodPost: { donor: "u1", save },
      }),
    });

    FoodRequest.updateMany.mockResolvedValue({});

    await acceptFoodRequest(
      { session: { userId: "u1" }, body: { requestId: "r1" } },
      mockRes()
    );

    expect(sendResponseMock).toHaveBeenCalled();
  });
});

// REJECT
describe("rejectedFoodRequest", () => {
  test("reject request", async () => {
    const save = jest.fn();

    FoodRequest.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: "r1",
        foodPost: { save },
      }),
    });

    await rejectedFoodRequest(
      { session: { userId: "u1" }, body: { requestId: "r1" } },
      mockRes()
    );

    expect(sendResponseMock).toHaveBeenCalled();
  });
});

// DELETE
describe("deleteFoodDonation", () => {
  test("delete success", async () => {
    FoodPost.findById.mockResolvedValue({ _id: "f1" });
    FoodPost.findByIdAndDelete.mockResolvedValue(true);

    await deleteFoodDonation(
      { params: { id: "f1" }, session: { userId: "u1" } },
      mockRes()
    );

    expect(sendResponseMock).toHaveBeenCalled();
  });
});