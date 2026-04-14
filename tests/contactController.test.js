import { jest } from "@jest/globals";

// ---------------- MOCKS FIRST ----------------
jest.unstable_mockModule("../models/ContactMessage.js", () => ({
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.unstable_mockModule("../utils/pagination.js", () => ({
  getPagination: jest.fn(() => ({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })),
}));

jest.unstable_mockModule("../utils/responseHandler.js", () => ({
  sendResponse: jest.fn(),
}));

// ---------------- IMPORT AFTER MOCKS ----------------
const {
  submitContactForm,
  getContactMessages,
  markMessageRead,
  deleteMessage,
} = await import("../controllers/contactController.js");

const ContactMessage = (await import("../models/ContactMessage.js")).default;
const { sendResponse } = await import("../utils/responseHandler.js");

// ---------------- RESET ----------------
beforeEach(() => {
  jest.clearAllMocks();
});

// ===================== TESTS =====================

describe("submitContactForm", () => {
  test("missing required fields", async () => {
    await submitContactForm(
      { body: {} },
      {}
    );

    expect(sendResponse).toHaveBeenCalled();
  });

  test("message too short", async () => {
    await submitContactForm(
      {
        body: {
          name: "John",
          email: "john@test.com",
          subject: "Hi",
          message: "short",
        },
      },
      {}
    );

    expect(sendResponse).toHaveBeenCalled();
  });

  test("success", async () => {
    ContactMessage.create.mockResolvedValue({
      _id: "1",
      name: "John",
      message: "This is a valid message",
    });

    await submitContactForm(
      {
        body: {
          name: "John",
          email: "john@test.com",
          subject: "Hello",
          message: "This is a valid message",
          inquiryType: "general",
          subscribe: true,
        },
      },
      {}
    );

    expect(ContactMessage.create).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });
});

// ===================== GET MESSAGES =====================

describe("getContactMessages", () => {
  test("returns paginated messages", async () => {
    ContactMessage.countDocuments.mockResolvedValue(2);

    ContactMessage.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () =>
              Promise.resolve([
                { _id: "1", message: "hello" },
                { _id: "2", message: "world" },
              ]),
          }),
        }),
      }),
    });

    await getContactMessages(
      { query: { page: 1, limit: 10, search: "" } },
      {}
    );

    expect(ContactMessage.find).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });
});

// ===================== MARK READ =====================

describe("markMessageRead", () => {
  test("message not found", async () => {
    ContactMessage.findById.mockResolvedValue(null);

    await markMessageRead(
      { params: { id: "123" } },
      {}
    );

    expect(sendResponse).toHaveBeenCalled();
  });

  test("success mark as read", async () => {
    const saveMock = jest.fn();

    ContactMessage.findById.mockResolvedValue({
      _id: "123",
      status: "unread",
      save: saveMock,
    });

    await markMessageRead(
      { params: { id: "123" } },
      {}
    );

    expect(saveMock).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });
});

// ===================== DELETE MESSAGE =====================

describe("deleteMessage", () => {
  test("message not found", async () => {
    ContactMessage.findById.mockResolvedValue(null);

    await deleteMessage(
      { params: { id: "123" } },
      {}
    );

    expect(sendResponse).toHaveBeenCalled();
  });

  test("delete success", async () => {
    ContactMessage.findById.mockResolvedValue({ _id: "123" });

    ContactMessage.findByIdAndDelete.mockResolvedValue(true);

    await deleteMessage(
      { params: { id: "123" } },
      {}
    );

    expect(ContactMessage.findByIdAndDelete).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });
});