# Fix: 500 Internal Server Error on Doctor Signup

## What I Fixed

### 1. **MongoDB URI Issue**
**Problem:** The MongoDB connection string was missing the database name.

**Fixed:** Updated `.env` file:
```
Before: mongodb+srv://suhaankareem17:suhaan786@cluster0.cebd7.mongodb.net/
After:  mongodb+srv://suhaankareem17:suhaan786@cluster0.cebd7.mongodb.net/medassist?retryWrites=true&w=majority
```

### 2. **Better Error Logging**
Added detailed error logging to help diagnose issues.

## Steps to Fix

### Step 1: Restart the Server
**IMPORTANT:** You must restart the server for the .env changes to take effect.

1. **Stop the current server:**
   - Go to the terminal running the server
   - Press `Ctrl + C`

2. **Start the server again:**
   ```bash
   cd server
   node server.js
   ```

3. **Verify it started:**
   You should see:
   ```
   Connected to MongoDB
   Gemini AI initialized successfully
   Server running on port 5000
   ```

### Step 2: Try Doctor Signup Again
1. Go to: http://localhost:5173/doctor/signup
2. Fill in the form
3. Click "Create Doctor Account"
4. It should work now! ✅

## Common Causes of 500 Error

### 1. MongoDB Connection Failed
**Symptoms:** Server can't connect to MongoDB Atlas

**Solutions:**
- Check if MongoDB URI is correct in `.env`
- Verify your IP is whitelisted in MongoDB Atlas
- Check if database user has proper permissions
- Ensure internet connection is stable

### 2. Missing Environment Variables
**Symptoms:** JWT_SECRET or MONGODB_URI not found

**Solution:** Verify `.env` file contains:
```
MONGODB_URI=mongodb+srv://suhaankareem17:suhaan786@cluster0.cebd7.mongodb.net/medassist?retryWrites=true&w=majority
GEMINI_API_KEY=AIzaSyD7Bb_Tt5GVoWotgGbgrS9LxVRaJBDVQvE
JWT_SECRET=cdvrs_secure_jwt_secret_key
PORT=5000
```

### 3. Email Already Exists
**Symptoms:** Error says email is already registered

**Solution:** Use a different email address

### 4. Server Not Restarted
**Symptoms:** Changes to `.env` not taking effect

**Solution:** Always restart the server after changing `.env` file

## How to Check Server Logs

If you still get errors, check the server terminal for detailed error messages:

1. Look for lines starting with `Signup error:`
2. Check the error message
3. Common errors:
   - `MongoNetworkError` = Can't connect to MongoDB
   - `ValidationError` = Missing required fields
   - `E11000 duplicate key` = Email already exists

## Testing Checklist

- [ ] Server is running (check terminal)
- [ ] MongoDB connection successful (check server logs)
- [ ] `.env` file has correct MongoDB URI with database name
- [ ] Using unique email address
- [ ] All required fields filled in form
- [ ] Browser console shows no CORS errors

## If Still Not Working

### Option 1: Check Server Terminal
Look at the server terminal output when you try to sign up. It will show the exact error.

### Option 2: Test with Postman/curl
Test the endpoint directly:

```bash
curl -X POST http://localhost:5000/api/auth/doctor/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Test",
    "email": "test@doctor.com",
    "password": "test123",
    "specialization": "General",
    "licenseNumber": "DOC123"
  }'
```

### Option 3: Use Local MongoDB
If MongoDB Atlas is having issues, you can use local MongoDB:

1. Install MongoDB locally
2. Change `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/medassist
   ```
3. Restart server

## Summary

✅ **Fixed MongoDB URI** - Added database name
✅ **Added error logging** - Better debugging
✅ **Server needs restart** - Apply .env changes

**Next Step:** Restart your server and try signing up again!
