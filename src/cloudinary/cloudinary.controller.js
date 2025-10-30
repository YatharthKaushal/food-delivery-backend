import cloudinary from "../config/cloudinary.config.js";
import { Readable } from "stream";

/**
 * Helper function to upload file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>} - Upload result
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to readable stream and pipe to Cloudinary
    const readableStream = Readable.from(fileBuffer);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Helper function to determine resource type based on mimetype
 * @param {string} mimetype - File mimetype
 * @returns {string} - Resource type (image, video, raw)
 */
const getResourceType = (mimetype) => {
  if (mimetype.startsWith("image/")) {
    return "image";
  } else if (mimetype.startsWith("video/")) {
    return "video";
  } else {
    return "raw"; // For documents and other files
  }
};

/**
 * Upload single file to Cloudinary
 * @route POST /api/cloudinary/upload/single
 * @access Public (or add auth middleware as needed)
 */
export const uploadSingleFile = async (req, res) => {
  try {
    // File is available in req.file (populated by multer middleware)
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
        data: null,
      });
    }

    // Optional: Get folder name from request body or query
    const folder = req.body.folder || req.query.folder || "tiffin-dabba/uploads";

    // Determine resource type
    const resourceType = getResourceType(file.mimetype);

    // Upload options
    const uploadOptions = {
      folder: folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    };

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file.buffer, uploadOptions);

    // Return success response with public URL
    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        size: result.bytes,
        width: result.width,
        height: result.height,
        createdAt: result.created_at,
      },
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // Handle Cloudinary-specific errors
    if (error.http_code) {
      return res.status(error.http_code).json({
        success: false,
        message: `Cloudinary error: ${error.message}`,
        data: null,
      });
    }

    // Handle general errors
    return res.status(500).json({
      success: false,
      message: "Failed to upload file to Cloudinary",
      data: null,
    });
  }
};

/**
 * Upload multiple files to Cloudinary
 * @route POST /api/cloudinary/upload/multiple
 * @access Public (or add auth middleware as needed)
 */
export const uploadMultipleFiles = async (req, res) => {
  try {
    // Files are available in req.files (populated by multer middleware)
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files provided",
        data: null,
      });
    }

    // Optional: Get folder name from request body or query
    const folder = req.body.folder || req.query.folder || "tiffin-dabba/uploads";

    // Upload all files to Cloudinary
    const uploadPromises = files.map((file) => {
      const resourceType = getResourceType(file.mimetype);

      const uploadOptions = {
        folder: folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      };

      return uploadToCloudinary(file.buffer, uploadOptions)
        .then((result) => ({
          success: true,
          originalName: file.originalname,
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
          size: result.bytes,
          width: result.width,
          height: result.height,
          createdAt: result.created_at,
        }))
        .catch((error) => ({
          success: false,
          originalName: file.originalname,
          error: error.message,
        }));
    });

    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);

    // Separate successful and failed uploads
    const successfulUploads = results.filter((r) => r.success);
    const failedUploads = results.filter((r) => !r.success);

    // Determine response status based on results
    const allSuccess = failedUploads.length === 0;
    const allFailed = successfulUploads.length === 0;

    if (allFailed) {
      return res.status(500).json({
        success: false,
        message: "All file uploads failed",
        data: {
          successful: [],
          failed: failedUploads,
          summary: {
            total: files.length,
            successful: 0,
            failed: failedUploads.length,
          },
        },
      });
    }

    // Return response with both successful and failed uploads
    return res.status(allSuccess ? 200 : 207).json({
      success: allSuccess,
      message: allSuccess
        ? "All files uploaded successfully"
        : "Some files failed to upload",
      data: {
        successful: successfulUploads,
        failed: failedUploads,
        summary: {
          total: files.length,
          successful: successfulUploads.length,
          failed: failedUploads.length,
        },
      },
    });
  } catch (error) {
    console.error("Cloudinary multiple upload error:", error);

    // Handle general errors
    return res.status(500).json({
      success: false,
      message: "Failed to upload files to Cloudinary",
      data: null,
    });
  }
};

/**
 * Delete a file from Cloudinary using public_id
 * @route DELETE /api/cloudinary/delete
 * @access Public (or add auth middleware as needed)
 */
export const deleteFile = async (req, res) => {
  try {
    const { publicId, resourceType = "image" } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Public ID is required",
        data: null,
      });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === "ok" || result.result === "not found") {
      return res.status(200).json({
        success: true,
        message:
          result.result === "ok"
            ? "File deleted successfully"
            : "File not found (may have been already deleted)",
        data: {
          publicId: publicId,
          result: result.result,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to delete file",
        data: {
          publicId: publicId,
          result: result.result,
        },
      });
    }
  } catch (error) {
    console.error("Cloudinary delete error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete file from Cloudinary",
      data: null,
    });
  }
};
