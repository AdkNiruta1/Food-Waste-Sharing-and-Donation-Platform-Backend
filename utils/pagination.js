// Utility to generate pagination metadata
export const getPagination = (page = 1, limit = 10, total) => {
  // Calculate and return pagination details
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
};
