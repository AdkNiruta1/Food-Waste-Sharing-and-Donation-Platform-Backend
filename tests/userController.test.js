import { jest } from "@jest/globals";

// ---------------- MOCKS FIRST ----------------
jest.unstable_mockModule("../models/userModel.js", () => ({
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
    genSalt: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/responseHandler.js", () => ({
  sendResponse: jest.fn(),
}));

jest.unstable_mockModule("../utils/saveImage.js", () => ({
  saveCompressedImage: jest.fn(),
}));

jest.unstable_mockModule("../utils/logger.js", () => ({
  logActivity: jest.fn(),
}));

jest.unstable_mockModule("../utils/sendEmail.js", () => ({
  sendEmail: jest.fn(),
}));

jest.unstable_mockModule("../controllers/notificationController.js", () => ({
  createNotification: jest.fn(),
}));

jest.unstable_mockModule("../models/foodPostModel.js", () => ({
  default: {
    countDocuments: jest.fn(),
    find: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/foodRequestModel.js", () => ({
  default: {
    countDocuments: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/RatingModel.js", () => ({
  default: {
    aggregate: jest.fn(),
  },
}));

// ---------------- IMPORT AFTER MOCKS ----------------
const {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
} = await import("../controllers/userController.js");

const User = (await import("../models/userModel.js")).default;
const bcrypt = (await import("bcryptjs")).default;
const { sendResponse } = await import("../utils/responseHandler.js");

// ---------------- RESET ----------------
beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------- TESTS ----------------

describe("registerUser", () => {
  test("missing fields", async () => {
    await registerUser({ body: {} }, {});
    expect(sendResponse).toHaveBeenCalled();
  });

  test("email exists", async () => {
    User.findOne.mockResolvedValue({ email: "test@test.com" });

    await registerUser(
      {
        body: {
          name: "A",
          email: "test@test.com",
          password: "123",
          role: "user",
          phone: "123",
          address: "ktm",
        },
        files: {},
      },
      {}
    );

    expect(sendResponse).toHaveBeenCalled();
  });
});

describe("loginUser", () => {
  test("invalid email", async () => {
    User.findOne.mockResolvedValue(null);

    await loginUser({ body: {}, session: {} }, {});
    expect(sendResponse).toHaveBeenCalled();
  });

  test("wrong password", async () => {
    User.findOne.mockResolvedValue({ password: "hashed" });
    bcrypt.compare.mockResolvedValue(false);

    await loginUser({ body: {}, session: {} }, {});
    expect(sendResponse).toHaveBeenCalled();
  });

  test("success", async () => {
    User.findOne.mockResolvedValue({ _id: "1", password: "hashed" });
    bcrypt.compare.mockResolvedValue(true);

    const req = { body: {}, session: {} };

    await loginUser(req, {});
    expect(req.session.userId).toBe("1");
  });
});

describe("getMe", () => {
  test("not logged in", async () => {
    await getMe({ session: {} }, {});
    expect(sendResponse).toHaveBeenCalled();
  });
});

describe("logoutUser", () => {
  test("logout success", async () => {
    const req = {
      session: {
        userId: "1",
        destroy: (cb) => cb(),
      },
    };

    const res = { clearCookie: jest.fn() };

    await logoutUser(req, res);

    expect(sendResponse).toHaveBeenCalled();
  });
});