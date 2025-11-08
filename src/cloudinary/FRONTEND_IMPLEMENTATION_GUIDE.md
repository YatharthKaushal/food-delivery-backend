# Frontend Media Upload Implementation Guide (for AI)

This guide explains how to implement media uploading functionality in the frontend application using the backend Cloudinary API endpoints.

---

## Core Concept: Upload-First Pattern

**IMPORTANT:** Media files are uploaded to Cloudinary **immediately** when the user selects or captures them, **before** the form submission. The public URL received from Cloudinary is stored temporarily in the component state and sent with the form data when the user finally submits.

### Why This Pattern?

1. Better UX - Users see immediate upload feedback
2. Faster form submission - File already uploaded when user clicks submit
3. Easier error handling - Upload errors can be shown immediately
4. No timeout issues - Large files don't delay form submission

---

## Implementation Flow

```
User Action → Select/Capture Media → Upload to Cloudinary Immediately
                                             ↓
                                    Get Public URL
                                             ↓
                                    Store URL in State
                                             ↓
User Clicks Submit → Send URL with Form Data → Backend API
```

---

## Complete Implementation Example

### Use Case: Creating a Menu Item with Image

```javascript
import { useState } from 'react';

function CreateMenuItemForm() {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
  });

  // Media upload state
  const [imageUrl, setImageUrl] = useState(null);
  const [imagePublicId, setImagePublicId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  /**
   * STEP 1: Handle media selection/capture
   * This fires immediately when user picks a file or takes a photo
   */
  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file before uploading
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    // Upload immediately
    await uploadImageToCloudinary(file);
  };

  /**
   * STEP 2: Upload to Cloudinary immediately
   * This happens BEFORE form submission
   */
  const uploadImageToCloudinary = async (file) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'tiffin-dabba/menu-items');

      // Upload to Cloudinary endpoint
      const response = await fetch('http://localhost:3000/api/cloudinary/upload/single', {
        method: 'POST',
        body: formData,
        // DO NOT set Content-Type header - browser will set it with boundary
      });

      const result = await response.json();

      if (result.success) {
        // STEP 3: Store URL and publicId in state
        setImageUrl(result.data.url);
        setImagePublicId(result.data.publicId);
        setUploadError(null);

        console.log('Image uploaded successfully:', result.data.url);
      } else {
        // Handle upload failure
        setUploadError(result.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Network error. Please check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * STEP 4: Handle form submission
   * Send the stored imageUrl with other form data
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validate that image is uploaded
    if (!imageUrl) {
      setSubmitError('Please upload an image before submitting');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Send form data WITH the Cloudinary URL
      const response = await fetch('http://localhost:3000/api/menu-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: imageUrl,  // ← Send the Cloudinary URL
          imagePublicId: imagePublicId, // Store for future deletion if needed
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Menu item created successfully');
        // Reset form or navigate away
      } else {
        setSubmitError(result.message || 'Failed to create menu item');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * OPTIONAL: Remove uploaded image before form submission
   * Useful if user wants to change their mind
   */
  const handleRemoveImage = async () => {
    if (!imagePublicId) return;

    try {
      // Delete from Cloudinary
      await fetch('http://localhost:3000/api/cloudinary/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicId: imagePublicId,
          resourceType: 'image',
        }),
      });

      // Clear state
      setImageUrl(null);
      setImagePublicId(null);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  /**
   * Validate file before uploading
   */
  const validateFile = (file) => {
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, GIF, and WebP images are allowed';
    }

    return null;
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Regular form fields */}
      <input
        type="text"
        placeholder="Menu Item Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <input
        type="number"
        placeholder="Price"
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        required
      />

      {/* Image upload section */}
      <div className="image-upload-section">
        <label>Menu Item Image</label>

        {/* Show upload button when no image */}
        {!imageUrl && (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={isUploading}
              id="image-input"
              style={{ display: 'none' }}
            />

            <label htmlFor="image-input" className="upload-button">
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </label>

            {/* Mobile: Camera option */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              disabled={isUploading}
              id="camera-input"
              style={{ display: 'none' }}
            />

            <label htmlFor="camera-input" className="camera-button">
              Take Photo
            </label>
          </div>
        )}

        {/* Show preview when image is uploaded */}
        {imageUrl && (
          <div className="image-preview">
            <img src={imageUrl} alt="Menu item" />
            <button type="button" onClick={handleRemoveImage}>
              Remove Image
            </button>
          </div>
        )}

        {/* Show upload progress/error */}
        {isUploading && <div className="uploading-indicator">Uploading image...</div>}
        {uploadError && <div className="error-message">{uploadError}</div>}
      </div>

      {/* Submit button */}
      <button type="submit" disabled={isSubmitting || isUploading || !imageUrl}>
        {isSubmitting ? 'Creating...' : 'Create Menu Item'}
      </button>

      {/* Submit error */}
      {submitError && <div className="error-message">{submitError}</div>}
    </form>
  );
}

export default CreateMenuItemForm;
```

---

## Key Implementation Points

### 1. State Management

You need these state variables:

```javascript
// Media URL(s) - This is what gets sent to backend API
const [imageUrl, setImageUrl] = useState(null);

// Public ID for deletion if needed
const [imagePublicId, setImagePublicId] = useState(null);

// Upload state
const [isUploading, setIsUploading] = useState(false);
const [uploadError, setUploadError] = useState(null);
```

### 2. File Input Setup

```javascript
// For file selection
<input
  type="file"
  accept="image/*"
  onChange={handleImageSelect}
/>

// For camera capture (mobile)
<input
  type="file"
  accept="image/*"
  capture="environment"  // Use 'user' for front camera
  onChange={handleImageSelect}
/>
```

### 3. Upload Request Format

**CRITICAL:** Do NOT set `Content-Type` header. Let the browser set it automatically with the multipart boundary.

```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('folder', 'tiffin-dabba/menu-items'); // Optional

const response = await fetch('http://localhost:3000/api/cloudinary/upload/single', {
  method: 'POST',
  body: formData,
  // NO Content-Type header here!
});
```

### 4. Response Structure

**Success Response (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/.../image.jpg",
    "publicId": "tiffin-dabba/menu-items/abc123",
    "format": "jpg",
    "resourceType": "image",
    "size": 245678,
    "width": 1920,
    "height": 1080,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

### 5. What to Store

Store these from the response:

```javascript
if (result.success) {
  setImageUrl(result.data.url);           // ← Required: Send to backend API
  setImagePublicId(result.data.publicId); // ← Optional: For deletion
}
```

### 6. Form Submission

When user submits the form, send the stored URL:

```javascript
const response = await fetch('http://localhost:3000/api/menu-items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: formData.name,
    price: formData.price,
    imageUrl: imageUrl,  // ← The Cloudinary URL from state
  }),
});
```

---

## Multiple Images Example

For features that need multiple images (e.g., image gallery):

```javascript
function ImageGalleryUpload() {
  const [imageUrls, setImageUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleMultipleImagesSelect = async (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;
    if (files.length > 10) {
      alert('Maximum 10 images allowed');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('folder', 'tiffin-dabba/gallery');

      const response = await fetch('http://localhost:3000/api/cloudinary/upload/multiple', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success || result.data.successful.length > 0) {
        // Extract URLs from successful uploads
        const urls = result.data.successful.map(file => file.url);
        setImageUrls(prevUrls => [...prevUrls, ...urls]);

        // Show warnings for failed uploads
        if (result.data.failed.length > 0) {
          const failedNames = result.data.failed.map(f => f.originalName).join(', ');
          alert(`Failed to upload: ${failedNames}`);
        }
      } else {
        alert('All uploads failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Network error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleMultipleImagesSelect}
        disabled={isUploading}
      />

      <div className="image-gallery">
        {imageUrls.map((url, index) => (
          <img key={index} src={url} alt={`Gallery ${index}`} />
        ))}
      </div>
    </div>
  );
}
```

---

## Error Handling Guide

### Common Errors and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "No file provided" | File not attached properly | Check `formData.append('file', file)` |
| "File size exceeds the limit of 10MB" | File too large | Show error, ask user to compress |
| "Invalid file type" | Unsupported format | Validate file type before upload |
| "Failed to upload file to Cloudinary" | Network/Cloudinary issue | Retry mechanism or ask user to try again |
| Network error / Fetch failed | No internet or server down | Check connection, show friendly error |

### Comprehensive Error Handling

```javascript
const uploadImageToCloudinary = async (file) => {
  setIsUploading(true);
  setUploadError(null);

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'tiffin-dabba/menu-items');

    const response = await fetch('http://localhost:3000/api/cloudinary/upload/single', {
      method: 'POST',
      body: formData,
    });

    // Check if response is OK
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      setImageUrl(result.data.url);
      setImagePublicId(result.data.publicId);
      return true;
    } else {
      // Backend returned error
      setUploadError(result.message || 'Upload failed');
      return false;
    }
  } catch (error) {
    console.error('Upload error:', error);

    // User-friendly error messages
    if (error.message.includes('Failed to fetch')) {
      setUploadError('Network error. Please check your internet connection.');
    } else if (error.message.includes('HTTP error')) {
      setUploadError('Server error. Please try again later.');
    } else {
      setUploadError('An unexpected error occurred. Please try again.');
    }

    return false;
  } finally {
    setIsUploading(false);
  }
};
```

---

## Validation Best Practices

### Client-Side Validation (Before Upload)

```javascript
const validateFile = (file) => {
  // 1. Check if file exists
  if (!file) {
    return 'No file selected';
  }

  // 2. Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return 'File size must be less than 10MB. Please compress or choose a smaller image.';
  }

  // 3. Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Please upload JPEG, PNG, GIF, WebP, or SVG images only.';
  }

  // 4. Check file name (optional)
  if (file.name.length > 255) {
    return 'File name is too long';
  }

  return null; // No errors
};

// Usage
const handleImageSelect = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const error = validateFile(file);
  if (error) {
    setUploadError(error);
    return;
  }

  await uploadImageToCloudinary(file);
};
```

---

## UI/UX Best Practices

### 1. Show Upload Progress

```javascript
<div className="upload-section">
  {isUploading && (
    <div className="upload-progress">
      <div className="spinner"></div>
      <p>Uploading image...</p>
    </div>
  )}
</div>
```

### 2. Preview Before Upload (Optional)

```javascript
const [previewUrl, setPreviewUrl] = useState(null);

const handleImageSelect = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Show preview immediately
  const reader = new FileReader();
  reader.onloadend = () => {
    setPreviewUrl(reader.result);
  };
  reader.readAsDataURL(file);

  // Then upload
  uploadImageToCloudinary(file);
};
```

### 3. Disable Submit Button During Upload

```javascript
<button
  type="submit"
  disabled={isUploading || !imageUrl || isSubmitting}
>
  {isSubmitting ? 'Creating...' : 'Create Menu Item'}
</button>
```

### 4. Success Feedback

```javascript
{imageUrl && !isUploading && (
  <div className="upload-success">
    ✓ Image uploaded successfully
  </div>
)}
```

---

## React Hooks Pattern

Create a reusable hook:

```javascript
// hooks/useCloudinaryUpload.js
import { useState } from 'react';

export const useCloudinaryUpload = (folder = 'tiffin-dabba/uploads') => {
  const [imageUrl, setImageUrl] = useState(null);
  const [imagePublicId, setImagePublicId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const uploadImage = async (file) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('http://localhost:3000/api/cloudinary/upload/single', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setImageUrl(result.data.url);
        setImagePublicId(result.data.publicId);
        return { success: true, url: result.data.url };
      } else {
        setUploadError(result.message);
        return { success: false, error: result.message };
      }
    } catch (error) {
      const errorMsg = 'Network error. Please try again.';
      setUploadError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setImageUrl(null);
    setImagePublicId(null);
    setUploadError(null);
  };

  return {
    imageUrl,
    imagePublicId,
    isUploading,
    uploadError,
    uploadImage,
    resetUpload,
  };
};

// Usage in component
function CreateMenuItemForm() {
  const { imageUrl, isUploading, uploadError, uploadImage } = useCloudinaryUpload('tiffin-dabba/menu-items');

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  };

  // Rest of component...
}
```

---

## Important Notes for AI Implementation

1. **Upload Timing**: ALWAYS upload immediately when file is selected, NOT when form is submitted
2. **URL Storage**: Store the Cloudinary URL in component state, then send it with form data
3. **Headers**: Do NOT set `Content-Type` header for file uploads - browser handles it
4. **Validation**: Validate file type and size on client-side before uploading
5. **Error Handling**: Show user-friendly error messages for all failure cases
6. **Loading States**: Always show loading indicator during upload
7. **Submit Button**: Disable submit button if image upload is required but not completed
8. **Mobile Support**: Use `capture` attribute for camera access on mobile devices
9. **Public ID**: Store `publicId` if you need to delete the image later
10. **Folder Path**: Use meaningful folder names (e.g., 'tiffin-dabba/menu-items', 'tiffin-dabba/users')

---

## Testing Checklist

When implementing, test these scenarios:

- [ ] Upload succeeds with valid image
- [ ] Upload fails with file too large (>10MB)
- [ ] Upload fails with invalid file type
- [ ] Upload fails with no internet connection
- [ ] Upload progress indicator shows during upload
- [ ] Submit button is disabled during upload
- [ ] Submit button is disabled if no image uploaded
- [ ] Error message displays for failed uploads
- [ ] Success feedback shows when upload completes
- [ ] Form submission includes the Cloudinary URL
- [ ] Image preview shows after upload (if implemented)
- [ ] Remove/Replace image functionality works (if implemented)
- [ ] Camera capture works on mobile devices (if implemented)
- [ ] Multiple images can be uploaded (if applicable)

---

## Quick Reference

### API Endpoint
```
POST http://localhost:3000/api/cloudinary/upload/single
```

### Request Format
```javascript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('folder', 'tiffin-dabba/menu-items'); // optional
```

### What to Send to Backend API
```javascript
{
  // Your form data
  name: "Paneer Tikka",
  price: 299,
  // The Cloudinary URL from upload response
  imageUrl: "https://res.cloudinary.com/.../image.jpg"
}
```

### File Limits
- Max file size: 10MB
- Max files in multiple upload: 10
- Supported types: JPEG, JPG, PNG, GIF, WebP, SVG, PDF, MP4, etc.

---

## React Native Specific Implementation

### CRITICAL: Content-Type Header Issue

**DO NOT set `Content-Type` header manually in React Native!** Let axios/fetch handle it automatically.

### ❌ WRONG - This causes "Bad Request" error:

```javascript
const response = await axios.post('/cloudinary/upload/single', formData, {
  headers: {
    'Content-Type': 'application/json',  // ❌ WRONG!
    'Authorization': `Bearer ${token}`,
  },
});
```

### ✅ CORRECT - Remove Content-Type or set it to multipart/form-data:

**Option 1: Don't set Content-Type (RECOMMENDED)**
```javascript
const response = await axios.post('/cloudinary/upload/single', formData, {
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    // NO Content-Type - axios will set it automatically with boundary
  },
});
```

**Option 2: Set to multipart/form-data (if your API interceptor requires it)**
```javascript
const response = await axios.post('/cloudinary/upload/single', formData, {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'multipart/form-data',  // ✅ OK, but axios handles boundary
    'Authorization': `Bearer ${token}`,
  },
});
```

### Complete React Native Upload Example

```javascript
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

// API configuration
const API_BASE_URL = 'https://food-delivery-backend-y6lw.onrender.com/api';

/**
 * Upload image to Cloudinary
 * @param {Object} imageAsset - Image asset from react-native-image-picker
 * @param {string} folder - Cloudinary folder path (optional)
 * @param {string} token - Auth token (optional)
 * @returns {Promise<string|null>} - Returns Cloudinary URL or null on error
 */
export const uploadImageToCloudinary = async (imageAsset, folder = 'tiffin-dabba/menu-items', token = null) => {
  try {
    // 1. Create FormData
    const formData = new FormData();

    // 2. Append file with correct field name 'file'
    formData.append('file', {
      uri: imageAsset.uri,
      type: imageAsset.type || 'image/jpeg',
      name: imageAsset.fileName || 'image.jpg',
    });

    // 3. Append folder (optional)
    formData.append('folder', folder);

    // 4. Prepare headers
    const headers = {
      'Accept': 'application/json',
      // ⚠️ CRITICAL: Do NOT set 'Content-Type'
      // Let axios handle it automatically
    };

    // 5. Add authorization if token provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 6. Upload to backend
    const response = await axios.post(
      `${API_BASE_URL}/cloudinary/upload/single`,
      formData,
      { headers }
    );

    // 7. Check success and return URL
    if (response.data.success) {
      console.log('✅ Upload successful:', response.data.data.url);
      return response.data.data.url;
    } else {
      console.error('❌ Upload failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Upload error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Pick image and upload to Cloudinary immediately
 */
export const pickAndUploadImage = async (folder = 'tiffin-dabba/menu-items', token = null) => {
  try {
    // 1. Launch image picker
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1920,
    });

    // 2. Handle cancel
    if (result.didCancel) {
      console.log('User cancelled image picker');
      return null;
    }

    // 3. Handle error
    if (result.errorCode) {
      console.error('ImagePicker Error:', result.errorMessage);
      return null;
    }

    // 4. Get asset
    const asset = result.assets?.[0];
    if (!asset) {
      console.error('No image selected');
      return null;
    }

    // 5. Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (asset.fileSize && asset.fileSize > maxSize) {
      console.error('File size exceeds 10MB limit');
      return null;
    }

    // 6. Upload to Cloudinary
    const imageUrl = await uploadImageToCloudinary(asset, folder, token);
    return imageUrl;
  } catch (error) {
    console.error('❌ Pick and upload error:', error);
    return null;
  }
};
```

### Usage in React Native Component

```javascript
import React, { useState } from 'react';
import { View, Button, Image, Text, ActivityIndicator } from 'react-native';
import { pickAndUploadImage } from './services/uploadService';

function CreateMenuItemScreen() {
  const [imageUrl, setImageUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleSelectImage = async () => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const token = 'your-auth-token-here'; // Get from your auth context/store
      const url = await pickAndUploadImage('tiffin-dabba/menu-items', token);

      if (url) {
        setImageUrl(url);
        console.log('Image URL stored:', url);
      } else {
        setUploadError('Failed to upload image');
      }
    } catch (error) {
      setUploadError(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitForm = async () => {
    if (!imageUrl) {
      alert('Please upload an image first');
      return;
    }

    // Submit your form with the imageUrl
    const formData = {
      name: 'Paneer Tikka',
      price: 299,
      imageUrl: imageUrl,  // ← Send the Cloudinary URL
    };

    // Your API call to create menu item
    const response = await axios.post('/menu-items', formData);
    console.log('Menu item created:', response.data);
  };

  return (
    <View>
      {!imageUrl && !isUploading && (
        <Button title="Select Image" onPress={handleSelectImage} />
      )}

      {isUploading && (
        <View>
          <ActivityIndicator size="large" />
          <Text>Uploading image...</Text>
        </View>
      )}

      {imageUrl && (
        <View>
          <Image source={{ uri: imageUrl }} style={{ width: 200, height: 200 }} />
          <Button title="Remove Image" onPress={() => setImageUrl(null)} />
        </View>
      )}

      {uploadError && <Text style={{ color: 'red' }}>{uploadError}</Text>}

      <Button
        title="Create Menu Item"
        onPress={handleSubmitForm}
        disabled={!imageUrl || isUploading}
      />
    </View>
  );
}
```

### Common React Native Issues and Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| "Bad Request" (400) | `Content-Type: application/json` set in headers | Remove Content-Type or set to multipart/form-data |
| File not uploading | Wrong field name (`image` instead of `file`) | Use `formData.append('file', ...)` |
| "Cannot POST /api/upload/image" | Wrong endpoint | Use `/api/cloudinary/upload/single` |
| File object format wrong | Missing uri/type/name properties | Ensure file object has: `{ uri, type, name }` |
| Axios interceptor overriding headers | Global interceptor sets Content-Type | Modify interceptor to skip for FormData |

### Axios Interceptor Fix (if you have one)

If you have an axios interceptor that sets headers globally, modify it to skip FormData:

```javascript
// Setup axios instance
const api = axios.create({
  baseURL: 'https://food-delivery-backend-y6lw.onrender.com/api',
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from storage
    const token = getAuthToken();

    // Set authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ⚠️ CRITICAL: Don't set Content-Type for FormData
    // Check if data is FormData
    if (config.data instanceof FormData) {
      // Don't set Content-Type - let axios handle it
      delete config.headers['Content-Type'];
    } else {
      // Set Content-Type for JSON requests
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
```

### Using with Axios Instance

```javascript
import api from './api'; // Your configured axios instance

export const uploadImage = async (imageAsset, folder = 'tiffin-dabba/menu-items') => {
  const formData = new FormData();

  formData.append('file', {
    uri: imageAsset.uri,
    type: imageAsset.type || 'image/jpeg',
    name: imageAsset.fileName || 'image.jpg',
  });

  formData.append('folder', folder);

  // Use your configured axios instance
  const response = await api.post('/cloudinary/upload/single', formData);

  return response.data.data.url;
};
```

---

## Summary

The upload-first pattern ensures:
1. Files are uploaded **immediately** when selected
2. Cloudinary URLs are **stored in state** temporarily
3. URLs are **sent with form data** when user submits
4. Better **user experience** with immediate feedback
5. Faster **form submission** as files are already uploaded

### React Native Key Points
- ✅ Use field name `file` (not `image`)
- ✅ Use endpoint `/api/cloudinary/upload/single`
- ✅ **DO NOT** set `Content-Type: application/json`
- ✅ Let axios/fetch handle Content-Type automatically
- ✅ File object must have: `{ uri, type, name }`
- ✅ Handle axios interceptors properly for FormData
