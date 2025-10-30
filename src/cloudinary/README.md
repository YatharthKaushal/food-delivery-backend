# Cloudinary File Upload API

This module provides centralized file upload functionality using Cloudinary. All file uploads in the application should use these routes.

## Overview

The Cloudinary API provides three main endpoints:
- **Upload Single File**: Upload one file at a time
- **Upload Multiple Files**: Upload multiple files (up to 10) in one request
- **Delete File**: Remove a file from Cloudinary

## Architecture

```
Frontend → Cloudinary API → Get Public URL → Backend API (with URL)
```

### Workflow Example:
1. User wants to create a menu item with an image
2. Frontend calls `/api/cloudinary/upload/single` with the image file
3. Cloudinary API returns the public URL
4. Frontend calls the menu item creation endpoint with the received URL
5. Backend saves the menu item with the URL in the database

This approach keeps file upload logic centralized and reusable.

---

## API Endpoints

All routes are prefixed with `/api/cloudinary`

### 1. Upload Single File

**Endpoint:** `POST /api/cloudinary/upload/single`

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file` (required): The file to upload
- `folder` (optional): Cloudinary folder path (default: `tiffin-dabba/uploads`)

**Success Response (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "tiffin-dabba/uploads/abc123",
    "format": "jpg",
    "resourceType": "image",
    "size": 245678,
    "width": 1920,
    "height": 1080,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "No file provided",
  "data": null
}
```

**Example Usage (JavaScript/Fetch):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('folder', 'tiffin-dabba/menu-items');

const response = await fetch('http://localhost:3000/api/cloudinary/upload/single', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.data.url); // Use this URL for database storage
```

**Example Usage (cURL):**
```bash
curl -X POST http://localhost:3000/api/cloudinary/upload/single \
  -F "file=@/path/to/image.jpg" \
  -F "folder=tiffin-dabba/menu-items"
```

---

### 2. Upload Multiple Files

**Endpoint:** `POST /api/cloudinary/upload/multiple`

**Content-Type:** `multipart/form-data`

**Request Body:**
- `files` (required): Array of files to upload (max 10 files)
- `folder` (optional): Cloudinary folder path (default: `tiffin-dabba/uploads`)

**Success Response (200 - All successful):**
```json
{
  "success": true,
  "message": "All files uploaded successfully",
  "data": {
    "successful": [
      {
        "success": true,
        "originalName": "image1.jpg",
        "url": "https://res.cloudinary.com/...",
        "publicId": "tiffin-dabba/uploads/abc123",
        "format": "jpg",
        "resourceType": "image",
        "size": 245678,
        "width": 1920,
        "height": 1080,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "failed": [],
    "summary": {
      "total": 1,
      "successful": 1,
      "failed": 0
    }
  }
}
```

**Partial Success Response (207 - Some failed):**
```json
{
  "success": false,
  "message": "Some files failed to upload",
  "data": {
    "successful": [...],
    "failed": [
      {
        "success": false,
        "originalName": "invalid.xyz",
        "error": "Invalid file type"
      }
    ],
    "summary": {
      "total": 5,
      "successful": 4,
      "failed": 1
    }
  }
}
```

**Example Usage (JavaScript/Fetch):**
```javascript
const formData = new FormData();
const files = fileInput.files;

for (let i = 0; i < files.length; i++) {
  formData.append('files', files[i]);
}
formData.append('folder', 'tiffin-dabba/gallery');

const response = await fetch('http://localhost:3000/api/cloudinary/upload/multiple', {
  method: 'POST',
  body: formData
});

const result = await response.json();
const urls = result.data.successful.map(file => file.url);
```

**Example Usage (cURL):**
```bash
curl -X POST http://localhost:3000/api/cloudinary/upload/multiple \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg" \
  -F "folder=tiffin-dabba/gallery"
```

---

### 3. Delete File

**Endpoint:** `DELETE /api/cloudinary/delete`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "publicId": "tiffin-dabba/uploads/abc123",
  "resourceType": "image"
}
```

**Parameters:**
- `publicId` (required): The public ID of the file to delete
- `resourceType` (optional): Type of resource - `image`, `video`, or `raw` (default: `image`)

**Success Response (200):**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "publicId": "tiffin-dabba/uploads/abc123",
    "result": "ok"
  }
}
```

**Example Usage (JavaScript/Fetch):**
```javascript
const response = await fetch('http://localhost:3000/api/cloudinary/delete', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    publicId: 'tiffin-dabba/uploads/abc123',
    resourceType: 'image'
  })
});

const result = await response.json();
```

**Example Usage (cURL):**
```bash
curl -X DELETE http://localhost:3000/api/cloudinary/delete \
  -H "Content-Type: application/json" \
  -d '{"publicId":"tiffin-dabba/uploads/abc123","resourceType":"image"}'
```

---

## File Type Support

### Supported File Types:

**Images:**
- jpeg, jpg, png, gif, webp, svg

**Documents:**
- pdf, doc, docx, txt

**Videos:**
- mp4, avi, mov, wmv, flv, mkv

### File Size Limit:
- Maximum file size: **10 MB** per file

---

## Error Handling

All endpoints follow a standardized response structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Description of success",
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

### Common Error Messages:

| Status Code | Message | Cause |
|-------------|---------|-------|
| 400 | No file provided | File field is missing in request |
| 400 | File size exceeds the limit of 10MB | File too large |
| 400 | Invalid file type | Unsupported file format |
| 400 | Too many files. Maximum 10 files allowed | More than 10 files sent |
| 500 | Failed to upload file to Cloudinary | Cloudinary service error |

---

## Folder Structure

Recommended folder naming convention:
- Menu items: `tiffin-dabba/menu-items`
- User profiles: `tiffin-dabba/users`
- Gallery: `tiffin-dabba/gallery`
- Documents: `tiffin-dabba/documents`

You can specify the folder in the request or use the default `tiffin-dabba/uploads`.

---

## Integration Examples

### Example 1: Creating a Menu Item with Image

```javascript
// Step 1: Upload image to Cloudinary
async function uploadMenuItemImage(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('folder', 'tiffin-dabba/menu-items');

  const response = await fetch('/api/cloudinary/upload/single', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  return result.data.url;
}

// Step 2: Create menu item with the received URL
async function createMenuItem(menuItemData, imageFile) {
  try {
    // Upload image first
    const imageUrl = await uploadMenuItemImage(imageFile);

    // Create menu item with the image URL
    const response = await fetch('/api/menu-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...menuItemData,
        imageUrl: imageUrl
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Error creating menu item:', error);
  }
}
```

### Example 2: Upload Multiple Images for Gallery

```javascript
async function uploadGalleryImages(files) {
  const formData = new FormData();

  files.forEach(file => {
    formData.append('files', file);
  });
  formData.append('folder', 'tiffin-dabba/gallery');

  const response = await fetch('/api/cloudinary/upload/multiple', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  if (result.success) {
    const urls = result.data.successful.map(file => file.url);
    console.log('Uploaded URLs:', urls);
    return urls;
  } else {
    console.error('Some uploads failed:', result.data.failed);
    return result.data.successful.map(file => file.url);
  }
}
```

---

## Files Structure

```
src/
├── cloudinary/
│   ├── cloudinary.controller.js  # Upload and delete logic
│   ├── cloudinary.route.js       # Route definitions
│   └── README.md                 # This file
├── middleware/
│   └── upload.middleware.js      # Multer configuration
└── config/
    └── cloudinary.config.js      # Cloudinary configuration
```

---

## Environment Variables

Ensure these variables are set in your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Testing with Postman

### Upload Single File:
1. Method: `POST`
2. URL: `http://localhost:3000/api/cloudinary/upload/single`
3. Body: `form-data`
   - Key: `file` (type: File)
   - Key: `folder` (type: Text, optional)

### Upload Multiple Files:
1. Method: `POST`
2. URL: `http://localhost:3000/api/cloudinary/upload/multiple`
3. Body: `form-data`
   - Key: `files` (type: File, select multiple files)
   - Key: `folder` (type: Text, optional)

### Delete File:
1. Method: `DELETE`
2. URL: `http://localhost:3000/api/cloudinary/delete`
3. Body: `raw` (JSON)
```json
{
  "publicId": "tiffin-dabba/uploads/abc123",
  "resourceType": "image"
}
```

---

## Notes

- All file uploads go through these centralized routes
- No file URLs are stored directly by these controllers
- The frontend receives the public URL and passes it to other endpoints
- This keeps upload logic separated from business logic
- Makes it easy to change cloud storage provider in the future
