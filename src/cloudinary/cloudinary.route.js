import express from "express";
import {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFile,
} from "./cloudinary.controller.js";
import {
  uploadSingle,
  uploadMultiple,
} from "../middleware/upload.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/cloudinary/upload/single
 * @desc    Upload a single file to Cloudinary
 * @access  Public (add authentication middleware if needed)
 * @body    file: File (multipart/form-data with field name 'file')
 * @body    folder: String (optional) - Cloudinary folder path
 * @returns { success, message, data: { url, publicId, format, resourceType, size, width, height, createdAt } }
 */
router.post("/upload/single", uploadSingle("file"), uploadSingleFile);

/**
 * @route   POST /api/cloudinary/upload/multiple
 * @desc    Upload multiple files to Cloudinary
 * @access  Public (add authentication middleware if needed)
 * @body    files: Files (multipart/form-data with field name 'files', max 10 files)
 * @body    folder: String (optional) - Cloudinary folder path
 * @returns { success, message, data: { successful: [], failed: [], summary: { total, successful, failed } } }
 */
router.post("/upload/multiple", uploadMultiple("files", 10), uploadMultipleFiles);

/**
 * @route   DELETE /api/cloudinary/delete
 * @desc    Delete a file from Cloudinary using public_id
 * @access  Public (add authentication middleware if needed)
 * @body    publicId: String (required) - Cloudinary public_id of the file
 * @body    resourceType: String (optional) - Type of resource (image, video, raw). Default: 'image'
 * @returns { success, message, data: { publicId, result } }
 */
router.delete("/delete", deleteFile);

export default router;
