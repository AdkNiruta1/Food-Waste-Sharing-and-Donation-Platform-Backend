import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(), 
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 15 * 1024 * 1024 }, // allow bigger upload
});
