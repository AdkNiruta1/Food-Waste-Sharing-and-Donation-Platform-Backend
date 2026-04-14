import { jest } from "@jest/globals";

// ================= MOCKS FIRST =================

jest.unstable_mockModule("../models/RatingModel.js", () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/userModel.js", () => ({
  default: {
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/logger.js", () => ({
  logActivity: jest.fn(),
}));

jest.unstable_mockModule("../utils/responseHandler.js", () => ({
  sendResponse: jest.fn(),
}));

jest.unstable_mockModule("../controllers/notificationController.js", () => ({
  createNotification: jest.fn(),
}));

// ================= IMPORT AFTER MOCK =================

const {
  rateUser,
  getUserRatings,
} = await import("../controllers/ratingController.js");

const Rating = (await import("../models/RatingModel.js")).default;
const User = (await import("../models/userModel.js")).default;

const { sendResponse } = await import("../utils/responseHandler.js");

// ================= RESET =================

beforeEach(() => {
  jest.clearAllMocks();
});

// ================= TESTS =================

describe("rateUser", () => {
  test("not logged in", async () => {
    await rateUser({ session: {}, body: {} }, {});

    expect(sendResponse).toHaveBeenCalled();
  });

  test("update existing rating", async () => {
    const saveMock = jest.fn();

    Rating.findOne.mockResolvedValue({
      _id: "1",
      rating: 3,
      comment: "old",
      save: saveMock,
    });

    Rating.aggregate.mockResolvedValue([{ avgRating: 4, count: 2 }]);

    const req = {
      session: { userId: "user1" },
      body: {
        receiverId: "receiver1",
        rating: 5,
        comment: "updated",
      },
    };

    await rateUser(req, {});

    expect(saveMock).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });

  test("create new rating", async () => {
    Rating.findOne.mockResolvedValue(null);

    Rating.create.mockResolvedValue({
      _id: "10",
      rating: 5,
      comment: "good",
    });

    Rating.aggregate.mockResolvedValue([{ avgRating: 5, count: 1 }]);

    const req = {
      session: { userId: "user1" },
      body: {
        receiverId: "receiver1",
        rating: 5,
        comment: "good",
      },
    };

    await rateUser(req, {});

    expect(Rating.create).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });
});

// ================= GET USER RATINGS =================

describe("getUserRatings", () => {
  test("success fetch ratings", async () => {
    Rating.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
    });

    Rating.find().populate().populate = jest.fn().mockReturnValue([
      { rating: 4 },
      { rating: 5 },
    ]);

    await getUserRatings(
      { params: { userId: "user1" } },
      {}
    );

    expect(sendResponse).toHaveBeenCalled();
  });
});