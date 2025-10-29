# API Authentication Fixes Applied

## Issues Fixed

### 1. **404 Not Found on `/api/auth/signup`**
**Problem:** The client was trying to access `/api/auth/signup` but the server only had `/api/auth/doctor/signup` and `/api/auth/patient/signup`.

**Solution:** Added a new patient signup endpoint at `/api/auth/signup` that accepts:
- name
- email
- password
- phoneNumber (optional)
- dateOfBirth (optional)

This endpoint creates a patient account and returns a JWT token.

### 2. **403 Forbidden on `/api/patients`**
**Problem:** The JWT token was being created with inconsistent field names. The login endpoint used `{ id: user._id }` while the protected routes expected `{ userId: user._id }`.

**Solution:** 
- Updated the login endpoint to use consistent field names: `{ userId: user._id, role: user.role }`
- All tokens now include both `userId` and `role` fields
- Token expiration set to 24 hours

### 3. **Token Management**
**Problem:** Tokens weren't being properly attached to API requests.

**Solution:** 
- Created `client/src/api/axios.js` with automatic token injection
- Added request interceptor to automatically add `Authorization: Bearer <token>` header
- Added response interceptor to handle 401/403 errors and redirect to login

## Files Modified

1. **server/server.js**
   - Added `/api/auth/signup` endpoint (line 173-225)
   - Updated `/api/auth/login` to use consistent token structure (line 287-301)

2. **client/src/pages/AuthPage.jsx**
   - Improved error handling
   - Added token validation
   - Fixed role-based navigation

3. **client/src/api/axios.js** (NEW FILE)
   - Axios instance with automatic token injection
   - Request/response interceptors for auth handling

## How to Test

### 1. Start the Server
```bash
cd server
npm start
```

### 2. Start the Client
```bash
cd client
npm run dev
```

### 3. Test Patient Registration
1. Navigate to `http://localhost:5173/signup`
2. Fill in the form:
   - Name: Test Patient
   - Email: patient@test.com
   - Password: test123
   - Phone Number: 1234567890 (optional)
3. Click "Sign Up"
4. You should be redirected to `/dashboard` with a success message

### 4. Test Login
1. Navigate to `http://localhost:5173/login`
2. Enter the credentials you just created
3. Click "Login"
4. You should be redirected to `/dashboard`

### 5. Test Protected Routes
1. After logging in, the app should automatically fetch data from protected endpoints
2. The token should be automatically included in all requests
3. If you log out or the token expires, you'll be redirected to login

## Next Steps (Optional Improvements)

1. **Use the axios instance throughout the app:**
   - Replace all `axios` imports with `import api from './api/axios'`
   - Replace `axios.get('http://localhost:5000/api/...')` with `api.get('/...')`
   - This will ensure all requests have the token automatically

2. **Add token refresh:**
   - Implement token refresh logic before expiration
   - Store refresh token separately

3. **Add role-based route protection:**
   - Create separate protected routes for doctors and patients
   - Redirect based on user role

## Environment Variables

Make sure your `server/.env` file contains:
```
MONGODB_URI=mongodb+srv://suhaankareem17:suhaan786@cluster0.cebd7.mongodb.net/
GEMINI_API_KEY=AIzaSyD7Bb_Tt5GVoWotgGbgrS9LxVRaJBDVQvE
JWT_SECRET=cdvrs_secure_jwt_secret_key
PORT=5000
```

## Common Issues

### Still getting 403 errors?
- **IMPORTANT:** Clear localStorage first: Open browser console and run `localStorage.clear()`
- Refresh the page
- Sign up or log in again
- The 403 error on `/api/patients` is normal for patient users - only doctors can access that endpoint

### Token not being sent?
- Check browser Network tab
- Look for `Authorization` header in request headers
- Should be: `Bearer <your-token>`

### Can't connect to MongoDB?
- Verify MongoDB connection string in `.env`
- Check if MongoDB Atlas allows connections from your IP
- Ensure database user has proper permissions

## Latest Fixes

### Fix 1: 403 Error on GET /api/patients

**Issue:** The app was trying to fetch patients for ALL users, but `/api/patients` is a doctor-only endpoint.

**Solution:** Updated `App.jsx` to check user role before fetching patients:
- Only doctors will call `/api/patients`
- Patients will skip this call entirely
- No more 403 errors for patient users!

### Fix 2: 404 Error on POST /api/patients

**Issue:** The "Add Patient" button was calling `POST /api/patients` but the endpoint didn't exist.

**Solution:** Added `POST /api/patients` endpoint in `server.js` (line 356-423):
- Doctors can now add patients to their practice
- Validates required fields (name, dateOfBirth, uniqueId)
- Automatically assigns the patient to the logged-in doctor
- Creates a default password if not provided

### To Test
1. **As a Patient:**
   - Open browser console and run: `localStorage.clear()`
   - Sign up as a patient at `/signup`
   - You should NOT see any 403 or 404 errors
   - You'll be redirected to `/dashboard` successfully

2. **As a Doctor:**
   - Sign up as a doctor at `/doctor/signup` (if that route exists)
   - Or use the doctor signup endpoint directly
   - You can now add patients using the "Add Patient" form
   - The patient will be automatically assigned to you
