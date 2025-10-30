import multer from "multer";
import path from "path";

// Configure multer for memory storage (files stored in memory as Buffer)
const storage = multer.memoryStorage();

// File filter function to validate file types
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedImageTypes = /jpeg|jpg|png|gif|webp|svg/;
  const allowedDocTypes = /pdf|doc|docx|txt/;
  const allowedVideoTypes = /mp4|avi|mov|wmv|flv|mkv/;

  // Get file extension
  const extname = path.extname(file.originalname).toLowerCase().slice(1);
  const mimetype = file.mimetype.toLowerCase();

  // Check if file type is allowed
  const isImage = allowedImageTypes.test(extname) && mimetype.startsWith("image/");
  const isDocument = allowedDocTypes.test(extname) && (mimetype.startsWith("application/") || mimetype.startsWith("text/"));
  const isVideo = allowedVideoTypes.test(extname) && mimetype.startsWith("video/");

  if (isImage || isDocument || isVideo) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: images (jpeg, jpg, png, gif, webp, svg), documents (pdf, doc, docx, txt), videos (mp4, avi, mov, wmv, flv, mkv)`
      ),
      false
    );
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Middleware for handling single file upload
export const uploadSingle = (fieldName = "file") => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);

    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size exceeds the limit of 10MB",
            data: null,
          });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: `Unexpected field name. Expected field: '${fieldName}'`,
            data: null,
          });
        }
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`,
          data: null,
        });
      } else if (err) {
        // Custom errors (from fileFilter)
        return res.status(400).json({
          success: false,
          message: err.message,
          data: null,
        });
      }

      // Check if file was provided
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file provided",
          data: null,
        });
      }

      next();
    });
  };
};

// Middleware for handling multiple files upload
export const uploadMultiple = (fieldName = "files", maxCount = 10) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);

    multipleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "One or more files exceed the limit of 10MB",
            data: null,
          });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: `Too many files or unexpected field name. Expected field: '${fieldName}', max count: ${maxCount}`,
            data: null,
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum ${maxCount} files allowed`,
            data: null,
          });
        }
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`,
          data: null,
        });
      } else if (err) {
        // Custom errors (from fileFilter)
        return res.status(400).json({
          success: false,
          message: err.message,
          data: null,
        });
      }

      // Check if files were provided
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files provided",
          data: null,
        });
      }

      next();
    });
  };
};
