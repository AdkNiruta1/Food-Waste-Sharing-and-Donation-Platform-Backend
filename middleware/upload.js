import multer from "multer";
// Middleware to handle file uploads
export const upload = multer({
  // Store files in memory as Buffer (required for processing with sharp or other tools)
  storage: multer.memoryStorage(),

  // Filter to allow only image files
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      // Reject files that are not images
      return cb(new Error("Only image files allowed"), false);
    }
    // Accept the file
    cb(null, true);
  },

  // Limit file size to 15MB
  limits: { fileSize: 15 * 1024 * 1024 },
});
