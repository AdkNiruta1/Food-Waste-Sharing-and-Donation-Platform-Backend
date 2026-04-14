import { jest } from "@jest/globals";

// ================= MOCKS FIRST =================

jest.unstable_mockModule("../models/NotificationsModel.js", () => ({
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/responseHandler.js", () => ({
  sendResponse: jest.fn(),
}));

jest.unstable_mockModule("../utils/pagination.js", () => ({
  getPagination: jest.fn(() => ({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })),
}));

// ================= IMPORT AFTER MOCKS =================

const {
  createNotification,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = await import("../controllers/notificationController.js");

const Notification = (await import("../models/NotificationsModel.js")).default;
const { sendResponse } = await import("../utils/responseHandler.js");

// ================= RESET =================

beforeEach(() => {
  jest.clearAllMocks();
});

// ================= TESTS =================

describe("createNotification", () => {
  test("should create notification", async () => {
    Notification.create.mockResolvedValue({
      _id: "1",
      message: "hello",
    });

    await createNotification("user1", "hello");

    expect(Notification.create).toHaveBeenCalledWith({
      user: "user1",
      message: "hello",
    });
  });
});

// ================= GET NOTIFICATIONS =================

describe("getMyNotifications", () => {
  test("not logged in", async () => {
    await getMyNotifications({ session: {} }, {});

    expect(sendResponse).toHaveBeenCalled();
  });

  test("success fetch notifications", async () => {
    Notification.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () =>
              Promise.resolve([
                { _id: "1", message: "test" },
              ]),
          }),
        }),
      }),
    });

    Notification.countDocuments.mockResolvedValue(5);

    await getMyNotifications(
      {
        session: { userId: "user1" },
        query: { page: 1, limit: 10 },
      },
      {}
    );

    expect(Notification.find).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });
});

// ================= MARK ONE READ =================

describe("markNotificationRead", () => {
  test("not found", async () => {
    Notification.findOne.mockResolvedValue(null);

    await markNotificationRead(
      { params: { id: "123" } },
      {}
    );

    expect(sendResponse).toHaveBeenCalled();
  });

  test("mark as read success", async () => {
    const saveMock = jest.fn();

    Notification.findOne.mockResolvedValue({
      _id: "123",
      read: false,
      save: saveMock,
    });

    await markNotificationRead(
      { params: { id: "123" } },
      {}
    );

    expect(saveMock).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });
});

// ================= MARK ALL READ =================

describe("markAllNotificationsRead", () => {
  test("success", async () => {
    Notification.updateMany.mockResolvedValue({ modifiedCount: 2 });

    await markAllNotificationsRead(
      { session: { userId: "user1" } },
      {}
    );

    expect(Notification.updateMany).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });
});

// ================= DELETE =================

describe("deleteNotification", () => {
  test("not found", async () => {
    Notification.findOneAndDelete.mockResolvedValue(null);

    await deleteNotification(
      { params: { id: "123" } },
      {}
    );

    expect(sendResponse).toHaveBeenCalled();
  });

  test("delete success", async () => {
    Notification.findOneAndDelete.mockResolvedValue({
      _id: "123",
    });

    await deleteNotification(
      { params: { id: "123" } },
      {}
    );

    expect(Notification.findOneAndDelete).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });
});
