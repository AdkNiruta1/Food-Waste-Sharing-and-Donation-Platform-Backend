// custom utility to send standardized API responses
export const sendResponse = (res, { message = "", data = null, status = 200 }) => {
  return res.status(status).json({
    message, // Message describing the response
    data,    // Optional data payload
  });
};