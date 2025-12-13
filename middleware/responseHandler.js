export const sendResponse = (res, {message = "", data = null, status = 200 }) => {
  return res.status(status).json({
    message,
    data,
  });
};
