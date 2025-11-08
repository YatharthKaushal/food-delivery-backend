# Frontend Implementation Guide: User Authentication & Onboarding

## Overview

This document provides a comprehensive guide for implementing Firebase phone OTP authentication and customer onboarding in the frontend application. The backend API uses Firebase Admin SDK to verify tokens and manage customer profiles.

**Backend Base URL**: `https://food-delivery-backend-y6lw.onrender.com`

---

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [API Endpoints](#api-endpoints)
3. [Request & Response Formats](#request--response-formats)
4. [Error Handling](#error-handling)
5. [Implementation Examples](#implementation-examples)
6. [Best Practices](#best-practices)

---

## Authentication Flow

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User enters phone number                                     │
│    ↓                                                             │
│ 2. Frontend initiates Firebase Phone Auth (sends OTP)           │
│    ↓                                                             │
│ 3. User enters OTP code                                         │
│    ↓                                                             │
│ 4. Firebase verifies OTP & returns ID token                     │
│    ↓                                                             │
│ 5. Frontend calls GET /api/auth/customer/status                 │
│    (with Firebase token in Authorization header)                │
│    ↓                                                             │
│ 6. Backend checks if customer exists & profile is complete      │
│    ↓                                                             │
│ 7a. If isProfileComplete = true  → Navigate to Home             │
│    ↓                                                             │
│ 7b. If isProfileComplete = false → Show Onboarding Form         │
│    ↓                                                             │
│ 8. User fills: name, email (optional), dietary preferences      │
│    ↓                                                             │
│ 9. Frontend calls PUT /api/auth/customer/onboarding             │
│    ↓                                                             │
│ 10. Backend updates profile & sets isProfileComplete = true     │
│    ↓                                                             │
│ 11. Navigate to Home (user is fully authenticated)              │
└─────────────────────────────────────────────────────────────────┘
```

### Firebase ID Token Management

**IMPORTANT**: Every API request to protected endpoints must include the Firebase ID token in the Authorization header:

```javascript
Authorization: Bearer <firebase_id_token>
```

The backend extracts the user's `uid` and `phone_number` from this token to authenticate and identify the user.

---

## API Endpoints

### 1. Check Profile Status

**Endpoint**: `GET /api/auth/customer/status`
**Authentication**: Required (Firebase Token)
**Purpose**: Check if customer profile exists and is complete

**When to Call**:
- Immediately after Firebase OTP verification succeeds
- On app launch (if user is already signed in to Firebase)
- Before allowing access to protected features

**Response Scenarios**:
- New user → Returns `isProfileComplete: false`, may create customer record
- Existing incomplete profile → Returns `isProfileComplete: false`
- Complete profile → Returns `isProfileComplete: true`

---

### 2. Complete Onboarding

**Endpoint**: `PUT /api/auth/customer/onboarding`
**Authentication**: Required (Firebase Token)
**Purpose**: Update customer profile and complete onboarding

**When to Call**:
- After status check returns `isProfileComplete: false`
- When user submits the onboarding form

**Required Data**:
- `name` (required, 2-100 characters)
- `email` (optional, valid email format)
- `dietaryPreferences` (optional, but recommended)

---

### 3. Create Test Customer (Admin Only)

**Endpoint**: `POST /api/auth/customer/test`
**Authentication**: Required (JWT Admin Token, NOT Firebase)
**Purpose**: Create test users for development

**Note**: This is for backend testing only, not for frontend implementation.

---

## Request & Response Formats

### 1. GET /api/auth/customer/status

#### Request Headers

```javascript
{
  "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ij..."
}
```

#### Success Response (New User - 201 Created)

```json
{
  "success": true,
  "message": "Customer profile created successfully",
  "data": {
    "isProfileComplete": false,
    "customerId": "507f1f77bcf86cd799439011",
    "isNewUser": true
  }
}
```

#### Success Response (Existing Incomplete Profile - 200 OK)

```json
{
  "success": true,
  "message": "Profile status retrieved successfully",
  "data": {
    "isProfileComplete": false,
    "customerId": "507f1f77bcf86cd799439011",
    "isNewUser": false,
    "hasName": false,
    "hasDietaryPreferences": false
  }
}
```

#### Success Response (Complete Profile - 200 OK)

```json
{
  "success": true,
  "message": "Profile status retrieved successfully",
  "data": {
    "isProfileComplete": true,
    "customerId": "507f1f77bcf86cd799439011",
    "isNewUser": false,
    "hasName": true,
    "hasDietaryPreferences": true
  }
}
```

#### Error Response (Missing Token - 401)

```json
{
  "success": false,
  "message": "Authorization header is missing",
  "data": {
    "error": "MISSING_AUTH_HEADER"
  }
}
```

#### Error Response (Invalid Token - 401)

```json
{
  "success": false,
  "message": "Failed to verify authentication token",
  "data": {
    "error": "TOKEN_VERIFICATION_FAILED"
  }
}
```

#### Error Response (Expired Token - 401)

```json
{
  "success": false,
  "message": "Token has expired. Please refresh your authentication",
  "data": {
    "error": "TOKEN_EXPIRED"
  }
}
```

---

### 2. PUT /api/auth/customer/onboarding

#### Request Headers

```javascript
{
  "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
  "Content-Type": "application/json"
}
```

#### Request Body (Minimal)

```json
{
  "name": "John Doe"
}
```

#### Request Body (Complete)

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "dietaryPreferences": {
    "foodType": "VEG",
    "eggiterian": false,
    "jainFriendly": true,
    "dabbaType": "STEEL DABBA",
    "spiceLevel": "MEDIUM"
  }
}
```

#### Field Specifications

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `name` | String | Yes | 2-100 characters | - |
| `email` | String | No | Valid email format | - |
| `dietaryPreferences.foodType` | String | No | VEG, NON-VEG, VEGAN | VEG |
| `dietaryPreferences.eggiterian` | Boolean | No | - | false |
| `dietaryPreferences.jainFriendly` | Boolean | No | - | false |
| `dietaryPreferences.dabbaType` | String | No | DISPOSABLE, STEEL DABBA | DISPOSABLE |
| `dietaryPreferences.spiceLevel` | String | No | HIGH, MEDIUM, LOW | MEDIUM |

**IMPORTANT**: Enum values are case-insensitive. The backend will convert them to uppercase automatically.

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "customerId": "507f1f77bcf86cd799439011",
    "isProfileComplete": true,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "dietaryPreferences": {
      "foodType": "VEG",
      "eggiterian": false,
      "jainFriendly": true,
      "dabbaType": "STEEL DABBA",
      "spiceLevel": "MEDIUM"
    }
  }
}
```

#### Error Response (Missing Name - 400)

```json
{
  "success": false,
  "message": "Name is required for onboarding",
  "data": {
    "error": "MISSING_NAME"
  }
}
```

#### Error Response (Invalid Name Length - 400)

```json
{
  "success": false,
  "message": "Name must be at least 2 characters long",
  "data": {
    "error": "INVALID_NAME_LENGTH"
  }
}
```

#### Error Response (Invalid Email - 400)

```json
{
  "success": false,
  "message": "Please provide a valid email address",
  "data": {
    "error": "INVALID_EMAIL_FORMAT"
  }
}
```

#### Error Response (Invalid Food Type - 400)

```json
{
  "success": false,
  "message": "Invalid food type",
  "data": {
    "error": "INVALID_FOOD_TYPE",
    "allowedValues": ["VEG", "NON-VEG", "VEGAN"]
  }
}
```

#### Error Response (Invalid Spice Level - 400)

```json
{
  "success": false,
  "message": "Invalid spice level",
  "data": {
    "error": "INVALID_SPICE_LEVEL",
    "allowedValues": ["HIGH", "MEDIUM", "LOW"]
  }
}
```

#### Error Response (Invalid Dabba Type - 400)

```json
{
  "success": false,
  "message": "Invalid dabba type",
  "data": {
    "error": "INVALID_DABBA_TYPE",
    "allowedValues": ["DISPOSABLE", "STEEL DABBA"]
  }
}
```

#### Error Response (Duplicate Email - 409)

```json
{
  "success": false,
  "message": "Email address is already registered with another account",
  "data": {
    "error": "DUPLICATE_EMAIL"
  }
}
```

#### Error Response (Customer Not Found - 404)

```json
{
  "success": false,
  "message": "Customer profile not found. Please check profile status first",
  "data": {
    "error": "CUSTOMER_NOT_FOUND"
  }
}
```

---

## Error Handling

### Error Code Reference

| Error Code | HTTP Status | Description | Action |
|------------|-------------|-------------|--------|
| `MISSING_AUTH_HEADER` | 401 | No Authorization header | Redirect to login |
| `INVALID_AUTH_FORMAT` | 401 | Invalid Bearer token format | Redirect to login |
| `MISSING_TOKEN` | 401 | Token is empty | Redirect to login |
| `TOKEN_EXPIRED` | 401 | Firebase token expired | Refresh token & retry |
| `TOKEN_REVOKED` | 401 | Token has been revoked | Re-authenticate user |
| `INVALID_TOKEN_FORMAT` | 401 | Malformed token | Redirect to login |
| `TOKEN_VERIFICATION_FAILED` | 401 | General token verification error | Redirect to login |
| `MISSING_USER_IDENTIFICATION` | 400 | No UID or phone in token | Contact support |
| `MISSING_UID` | 401 | No UID in decoded token | Contact support |
| `MISSING_NAME` | 400 | Name not provided | Show validation error |
| `INVALID_NAME_LENGTH` | 400 | Name too short/long | Show validation error |
| `INVALID_EMAIL_FORMAT` | 400 | Invalid email | Show validation error |
| `INVALID_FOOD_TYPE` | 400 | Invalid food type enum | Show dropdown values |
| `INVALID_SPICE_LEVEL` | 400 | Invalid spice level enum | Show dropdown values |
| `INVALID_DABBA_TYPE` | 400 | Invalid dabba type enum | Show dropdown values |
| `DUPLICATE_EMAIL` | 409 | Email already exists | Ask user to use different email |
| `DUPLICATE_CUSTOMER` | 409 | Customer already exists | Redirect to login |
| `CUSTOMER_NOT_FOUND` | 404 | Customer record not found | Call status endpoint first |
| `VALIDATION_ERROR` | 400 | Schema validation failed | Show validation errors |

### Token Refresh Strategy

Firebase ID tokens expire after 1 hour. Implement automatic token refresh:

```javascript
// Get fresh token before making API calls
const getValidToken = async (user) => {
  try {
    // Force refresh if token is close to expiry
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Redirect to login
    throw error;
  }
};
```

---

## Implementation Examples

### Example 1: React - Phone Authentication Flow

```javascript
import { useState } from 'react';
import { auth } from './firebase-config';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const API_BASE_URL = 'https://food-delivery-backend-y6lw.onrender.com';

function PhoneAuth() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Setup reCAPTCHA (call once on component mount)
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
        },
        auth
      );
    }
  };

  // Step 2: Send OTP
  const sendOTP = async () => {
    try {
      setLoading(true);
      setError('');

      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;

      // Format phone number with country code
      const formattedPhone = `+91${phoneNumber}`;

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier
      );

      setVerificationId(confirmationResult);
      setLoading(false);
      alert('OTP sent successfully!');
    } catch (error) {
      setLoading(false);
      setError(error.message);
      console.error('Error sending OTP:', error);
    }
  };

  // Step 3: Verify OTP
  const verifyOTP = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await verificationId.confirm(otp);
      const user = result.user;

      // Get Firebase ID token
      const idToken = await user.getIdToken();

      // Step 4: Check profile status
      await checkProfileStatus(idToken);

    } catch (error) {
      setLoading(false);
      setError('Invalid OTP. Please try again.');
      console.error('Error verifying OTP:', error);
    }
  };

  // Step 4: Check profile status
  const checkProfileStatus = async (idToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/customer/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check profile status');
      }

      if (data.success) {
        if (data.data.isProfileComplete) {
          // Navigate to home
          window.location.href = '/home';
        } else {
          // Navigate to onboarding
          window.location.href = '/onboarding';
        }
      }
    } catch (error) {
      setLoading(false);
      setError(error.message);
      console.error('Error checking profile status:', error);
    }
  };

  return (
    <div>
      <div id="recaptcha-container"></div>

      {!verificationId ? (
        // Phone number input
        <div>
          <input
            type="tel"
            placeholder="Enter 10-digit phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            maxLength={10}
          />
          <button onClick={sendOTP} disabled={loading || phoneNumber.length !== 10}>
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </div>
      ) : (
        // OTP input
        <div>
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
          />
          <button onClick={verifyOTP} disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default PhoneAuth;
```

---

### Example 2: React - Onboarding Form

```javascript
import { useState } from 'react';
import { auth } from './firebase-config';

const API_BASE_URL = 'https://food-delivery-backend-y6lw.onrender.com';

function OnboardingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dietaryPreferences: {
      foodType: 'VEG',
      eggiterian: false,
      jainFriendly: false,
      dabbaType: 'DISPOSABLE',
      spiceLevel: 'MEDIUM',
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      // Get current user and token
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated. Please login again.');
      }

      // Get fresh ID token
      const idToken = await user.getIdToken(true);

      // Submit onboarding data
      const response = await fetch(`${API_BASE_URL}/api/auth/customer/onboarding`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (data.data?.error === 'DUPLICATE_EMAIL') {
          throw new Error('This email is already registered. Please use a different email.');
        }
        if (data.data?.error === 'MISSING_NAME') {
          throw new Error('Name is required to complete your profile.');
        }
        if (data.data?.error === 'INVALID_EMAIL_FORMAT') {
          throw new Error('Please enter a valid email address.');
        }
        throw new Error(data.message || 'Failed to complete onboarding');
      }

      if (data.success) {
        // Onboarding successful
        alert('Profile completed successfully!');
        window.location.href = '/home';
      }
    } catch (error) {
      setLoading(false);
      setError(error.message);
      console.error('Error completing onboarding:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Complete Your Profile</h2>

      {/* Name Input */}
      <div>
        <label>Name *</label>
        <input
          type="text"
          required
          minLength={2}
          maxLength={100}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter your full name"
        />
      </div>

      {/* Email Input */}
      <div>
        <label>Email (Optional)</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="Enter your email"
        />
      </div>

      {/* Food Type */}
      <div>
        <label>Food Type</label>
        <select
          value={formData.dietaryPreferences.foodType}
          onChange={(e) =>
            setFormData({
              ...formData,
              dietaryPreferences: {
                ...formData.dietaryPreferences,
                foodType: e.target.value,
              },
            })
          }
        >
          <option value="VEG">Vegetarian</option>
          <option value="NON-VEG">Non-Vegetarian</option>
          <option value="VEGAN">Vegan</option>
        </select>
      </div>

      {/* Eggiterian */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.dietaryPreferences.eggiterian}
            onChange={(e) =>
              setFormData({
                ...formData,
                dietaryPreferences: {
                  ...formData.dietaryPreferences,
                  eggiterian: e.target.checked,
                },
              })
            }
          />
          Eggiterian (Eggs allowed)
        </label>
      </div>

      {/* Jain Friendly */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.dietaryPreferences.jainFriendly}
            onChange={(e) =>
              setFormData({
                ...formData,
                dietaryPreferences: {
                  ...formData.dietaryPreferences,
                  jainFriendly: e.target.checked,
                },
              })
            }
          />
          Jain Friendly (No onion, garlic, root vegetables)
        </label>
      </div>

      {/* Dabba Type */}
      <div>
        <label>Dabba Type</label>
        <select
          value={formData.dietaryPreferences.dabbaType}
          onChange={(e) =>
            setFormData({
              ...formData,
              dietaryPreferences: {
                ...formData.dietaryPreferences,
                dabbaType: e.target.value,
              },
            })
          }
        >
          <option value="DISPOSABLE">Disposable</option>
          <option value="STEEL DABBA">Steel Dabba</option>
        </select>
      </div>

      {/* Spice Level */}
      <div>
        <label>Spice Level</label>
        <select
          value={formData.dietaryPreferences.spiceLevel}
          onChange={(e) =>
            setFormData({
              ...formData,
              dietaryPreferences: {
                ...formData.dietaryPreferences,
                spiceLevel: e.target.value,
              },
            })
          }
        >
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Complete Profile'}
      </button>
    </form>
  );
}

export default OnboardingForm;
```

---

### Example 3: Axios Service with Token Refresh

```javascript
import axios from 'axios';
import { auth } from './firebase-config';

const API_BASE_URL = 'https://food-delivery-backend-y6lw.onrender.com';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;

    if (user) {
      try {
        // Get fresh token (Firebase caches it if not expired)
        const token = await user.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Failed to get token:', error);
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const user = auth.currentUser;
        if (user) {
          // Force token refresh
          const newToken = await user.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } else {
          // No user, redirect to login
          window.location.href = '/login';
        }
      } catch (refreshError) {
        // Token refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const customerAPI = {
  // Check profile status
  checkStatus: async () => {
    const response = await apiClient.get('/api/auth/customer/status');
    return response.data;
  },

  // Complete onboarding
  completeOnboarding: async (data) => {
    const response = await apiClient.put('/api/auth/customer/onboarding', data);
    return response.data;
  },
};

export default apiClient;
```

#### Usage in Components

```javascript
import { customerAPI } from './api-service';

// In your component
const handleCheckStatus = async () => {
  try {
    const data = await customerAPI.checkStatus();
    console.log('Status:', data);

    if (data.success && data.data.isProfileComplete) {
      navigate('/home');
    } else {
      navigate('/onboarding');
    }
  } catch (error) {
    console.error('Error:', error);
    if (error.response?.data?.data?.error === 'TOKEN_EXPIRED') {
      // Token refresh will be handled by interceptor
    }
  }
};

const handleOnboarding = async (formData) => {
  try {
    const data = await customerAPI.completeOnboarding(formData);
    console.log('Onboarding complete:', data);
    navigate('/home');
  } catch (error) {
    console.error('Error:', error);

    // Handle specific errors
    const errorCode = error.response?.data?.data?.error;
    switch (errorCode) {
      case 'DUPLICATE_EMAIL':
        setError('Email already registered. Use a different email.');
        break;
      case 'MISSING_NAME':
        setError('Name is required.');
        break;
      case 'INVALID_EMAIL_FORMAT':
        setError('Invalid email format.');
        break;
      default:
        setError(error.response?.data?.message || 'Something went wrong');
    }
  }
};
```

---

### Example 4: React Native - Phone Auth Flow

```javascript
import { useState } from 'react';
import auth from '@react-native-firebase/auth';
import axios from 'axios';

const API_BASE_URL = 'https://food-delivery-backend-y6lw.onrender.com';

function PhoneAuthScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Send OTP
  const signInWithPhoneNumber = async () => {
    try {
      setLoading(true);
      const confirmation = await auth().signInWithPhoneNumber(`+91${phoneNumber}`);
      setConfirm(confirmation);
      setLoading(false);
      alert('OTP sent!');
    } catch (error) {
      setLoading(false);
      alert(error.message);
    }
  };

  // Step 2: Verify OTP
  const confirmCode = async () => {
    try {
      setLoading(true);
      const userCredential = await confirm.confirm(code);
      const user = userCredential.user;

      // Get ID token
      const idToken = await user.getIdToken();

      // Check profile status
      const response = await axios.get(
        `${API_BASE_URL}/api/auth/customer/status`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      setLoading(false);

      if (response.data.success) {
        if (response.data.data.isProfileComplete) {
          // Navigate to home
          navigation.navigate('Home');
        } else {
          // Navigate to onboarding
          navigation.navigate('Onboarding');
        }
      }
    } catch (error) {
      setLoading(false);
      alert('Invalid code');
    }
  };

  return (
    <View>
      {!confirm ? (
        <>
          <TextInput
            placeholder="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <Button
            title="Send OTP"
            onPress={signInWithPhoneNumber}
            disabled={loading || phoneNumber.length !== 10}
          />
        </>
      ) : (
        <>
          <TextInput
            placeholder="Enter OTP"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button
            title="Verify OTP"
            onPress={confirmCode}
            disabled={loading || code.length !== 6}
          />
        </>
      )}
    </View>
  );
}
```

---

## Best Practices

### 1. Token Management

**✅ DO**:
- Always use `getIdToken(true)` to force refresh before critical operations
- Store tokens securely (never in localStorage for sensitive apps)
- Implement automatic token refresh in API interceptors
- Handle token expiration gracefully with retry logic

**❌ DON'T**:
- Store tokens in plain localStorage on web (use httpOnly cookies if possible)
- Reuse old tokens without checking expiration
- Ignore 401 errors

### 2. Error Handling

**✅ DO**:
- Display user-friendly error messages
- Log errors to monitoring service (Sentry, LogRocket, etc.)
- Handle network failures gracefully
- Provide retry options for transient errors

**❌ DON'T**:
- Show raw error messages to users
- Ignore error codes from backend
- Let app crash on network errors

### 3. User Experience

**✅ DO**:
- Show loading states during API calls
- Validate input on frontend before submitting
- Provide clear feedback for validation errors
- Auto-navigate based on `isProfileComplete` status
- Implement offline detection

**❌ DON'T**:
- Submit forms without loading indicators
- Allow invalid data to reach backend
- Leave users confused about what went wrong

### 4. Security

**✅ DO**:
- Always use HTTPS for API calls
- Validate Firebase token on every request
- Use Firebase reCAPTCHA for phone auth
- Implement rate limiting on frontend
- Clear tokens on logout

**❌ DON'T**:
- Store sensitive data in local storage
- Skip reCAPTCHA verification
- Expose tokens in URLs or logs
- Share tokens between users

### 5. Form Validation

**✅ DO**:
- Validate name length (2-100 chars)
- Validate email format before submission
- Validate enum values match allowed options
- Trim whitespace from inputs
- Show inline validation errors

**❌ DON'T**:
- Allow empty name submission
- Skip email format validation
- Send lowercase enum values (backend handles this, but good practice)

### 6. Navigation Logic

```javascript
// Recommended navigation flow
const handleAuthSuccess = async (idToken) => {
  try {
    const statusData = await checkProfileStatus(idToken);

    if (statusData.data.isProfileComplete) {
      navigate('/home');
    } else {
      // Pass data to onboarding to pre-fill if available
      navigate('/onboarding', {
        state: {
          hasName: statusData.data.hasName,
          hasDietaryPreferences: statusData.data.hasDietaryPreferences
        }
      });
    }
  } catch (error) {
    // Handle error
    if (error.response?.status === 401) {
      navigate('/login');
    } else {
      showError('Something went wrong. Please try again.');
    }
  }
};
```

### 7. Testing Considerations

**Test Scenarios**:
1. New user flow (OTP → Status → Onboarding → Home)
2. Returning user flow (OTP → Status → Home)
3. Token expiration during onboarding
4. Network failure during API calls
5. Duplicate email error handling
6. Invalid input validation
7. Incomplete onboarding (user closes app mid-flow)

**Test with Test Customer API** (for backend testing):
```javascript
// Only for development - requires admin JWT
const createTestUser = async (phoneNumber) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/customer/test`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <admin_jwt_token>',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phoneNumber }),
  });

  const data = await response.json();
  console.log('Custom Token:', data.data.customToken);
  // Use this token to authenticate as test user
};
```

---

## Complete Integration Checklist

- [ ] Firebase project setup with Phone Auth enabled
- [ ] reCAPTCHA configured (web) or App Verification (mobile)
- [ ] Firebase Auth SDK installed and initialized
- [ ] Phone number input with validation (10 digits)
- [ ] OTP input screen with 6-digit code
- [ ] Token management with auto-refresh
- [ ] API client with Authorization header interceptor
- [ ] Profile status check after OTP verification
- [ ] Onboarding form with all fields
- [ ] Form validation (name, email, enums)
- [ ] Error handling for all API calls
- [ ] Loading states for all async operations
- [ ] Navigation logic based on `isProfileComplete`
- [ ] Logout functionality (clear Firebase auth + tokens)
- [ ] 401 error handling (redirect to login)
- [ ] Network error handling
- [ ] Testing with real phone numbers
- [ ] Testing error scenarios

---

## Middleware Details (Backend)

### verifyFirebaseToken Middleware

**Purpose**: Verifies Firebase ID token and attaches user data to `req.firebaseUser`

**Attached Data**:
```javascript
req.firebaseUser = {
  uid: string,              // Firebase user ID (always present)
  phoneNumber: string|null, // Phone number with country code
  email: string|null,       // Email if available
  emailVerified: boolean,   // Email verification status
  name: string|null,        // Display name if available
  picture: string|null,     // Profile picture URL if available
  decodedToken: object      // Full decoded token
}
```

**Usage in Controllers**:
```javascript
// In customer.auth.controller.js
const { uid, phoneNumber } = req.firebaseUser;

// Build query using firebaseUid
const customer = await Customer.findOne({
  firebaseUid: uid,
  isDeleted: false
});
```

### attachCustomer Middleware

**Purpose**: Fetches and attaches full customer document to `req.customer`

**When to Use**:
- For routes that need full customer details
- After user has completed onboarding
- When `isProfileComplete = true` is guaranteed

**Not Used in Auth Routes**: The auth routes only use `verifyFirebaseToken` because they handle customer creation/update logic themselves.

---

## Additional Notes

### Phone Number Format

- **Frontend Input**: 10 digits (e.g., `9876543210`)
- **Firebase Format**: With country code (e.g., `+919876543210`)
- **Database Storage**: 10 digits without country code (e.g., `9876543210`)

### Profile Completion Logic

The backend marks `isProfileComplete = true` when:
1. `name` is provided (required)
2. `dietaryPreferences.foodType` exists (either from request or from existing profile)

**Note**: Email is optional and doesn't affect profile completion status.

### Customer Schema Key Fields

```javascript
{
  firebaseUid: String,      // Unique identifier from Firebase
  phone: String,            // 10-digit phone number
  name: String,             // Customer name (required for completion)
  email: String,            // Optional
  dietaryPreferences: {
    foodType: String,       // VEG | NON-VEG | VEGAN
    eggiterian: Boolean,
    jainFriendly: Boolean,
    dabbaType: String,      // DISPOSABLE | STEEL DABBA
    spiceLevel: String      // HIGH | MEDIUM | LOW
  },
  isProfileComplete: Boolean,
  isDeleted: Boolean        // Soft delete flag
}
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Token expired" errors
**Solution**: Implement automatic token refresh using `getIdToken(true)`

**Issue**: "Customer not found" on onboarding
**Solution**: Always call status endpoint first, which creates customer record

**Issue**: "Invalid token format"
**Solution**: Ensure Bearer token format: `Authorization: Bearer <token>`

**Issue**: reCAPTCHA not working (web)
**Solution**: Add your domain to Firebase Console → Authentication → Settings → Authorized domains

**Issue**: Phone auth not working (React Native)
**Solution**: Enable App Verification in Firebase Console and configure SHA certificates

---

## Conclusion

This implementation guide provides everything needed to integrate Firebase phone authentication and customer onboarding in your frontend application. Follow the examples, handle errors properly, and test thoroughly for a smooth user experience.

For backend issues or API changes, contact the backend team or check the controller files in the repository.
