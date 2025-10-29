# Fix: 500 Error on Process Discharge Summary

## Problem
Getting a 500 Internal Server Error when trying to process discharge summary:
```
POST http://localhost:5000/api/patients/{id}/process-summary 500 (Internal Server Error)
```

## Common Causes

### 1. **Gemini AI Not Initialized**
- GEMINI_API_KEY missing or invalid in `.env`
- Server not restarted after `.env` changes
- API key has expired or reached quota limit

### 2. **Gemini AI API Error**
- Network connectivity issues
- API rate limit exceeded
- Invalid API request format

### 3. **Invalid Discharge Summary Format**
- Empty or malformed input
- AI unable to parse medication information

## Solutions Applied

### 1. **Better Error Handling**
Added comprehensive error checking:
- Validates Gemini AI is initialized before use
- Catches AI API errors separately
- Provides detailed error messages
- Logs full error stack for debugging

### 2. **Improved Error Messages**
Now you'll see specific errors like:
- "AI service not available" - Gemini AI not initialized
- "AI service error" - Problem calling Gemini API
- "Failed to parse medication information" - AI response invalid

## How to Fix

### Step 1: Verify GEMINI_API_KEY

Check your `.env` file:
```
GEMINI_API_KEY=AIzaSyD7Bb_Tt5GVoWotgGbgrS9LxVRaJBDVQvE
```

**Test if the key is valid:**
1. Go to: https://makersuite.google.com/app/apikey
2. Check if your API key is active
3. Verify it hasn't reached quota limits

### Step 2: Restart the Server

**CRITICAL:** The server must be restarted to load `.env` changes.

1. Stop the server (Ctrl+C in terminal)
2. Start it again:
   ```bash
   cd server
   node server.js
   ```
3. Check for this message:
   ```
   Gemini AI initialized successfully
   Connected to MongoDB
   Server running on port 5000
   ```

### Step 3: Check Server Logs

When you try to process a discharge summary, watch the server terminal for:
- "Sending request to Gemini AI..." ✅
- "Received response from Gemini AI..." ✅
- Any error messages ❌

### Step 4: Test with Simple Input

Try a simple discharge summary first:
```
Patient should take Amoxicillin 500mg three times daily for 7 days.
```

This should work if the API is properly configured.

## Troubleshooting

### Error: "AI service not available"
**Cause:** Gemini AI not initialized

**Solutions:**
1. Check GEMINI_API_KEY in `.env`
2. Restart the server
3. Check server startup logs for "Gemini AI initialized successfully"

### Error: "AI service error"
**Cause:** Problem calling Gemini API

**Solutions:**
1. Check internet connection
2. Verify API key is valid (not expired/quota exceeded)
3. Try again in a few minutes (rate limiting)
4. Check Gemini API status: https://status.cloud.google.com/

### Error: "Failed to parse medication information"
**Cause:** AI response wasn't valid JSON

**Solutions:**
1. Try rephrasing the discharge summary
2. Make it more structured and clear
3. Example good format:
   ```
   Medications:
   1. Amoxicillin 500mg - Take three times daily for 7 days
   2. Ibuprofen 200mg - Take twice daily as needed for pain
   ```

### Still Getting 500 Error?

Check the server terminal for the exact error message. Common issues:

1. **MongoDB connection failed:**
   ```
   Error: Could not connect to MongoDB
   ```
   Solution: Check MongoDB URI in `.env`

2. **Invalid patient ID:**
   ```
   Patient not found: {id}
   ```
   Solution: Make sure you're using a valid patient ID

3. **Gemini API quota exceeded:**
   ```
   Error: 429 Resource has been exhausted
   ```
   Solution: Wait or upgrade your Gemini API plan

## Alternative: Mock Response (For Testing)

If Gemini API is not working, you can temporarily use a mock response for testing:

Add this to `server.js` before the Gemini AI call:

```javascript
// TEMPORARY: Mock response for testing
if (process.env.USE_MOCK_AI === 'true') {
  medicationsText = JSON.stringify([
    {
      name: "Test Medication",
      dosage: "500mg",
      frequency: "twice daily",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);
  console.log('Using mock AI response');
} else {
  // ... existing Gemini AI code
}
```

Then add to `.env`:
```
USE_MOCK_AI=true
```

## Testing Checklist

- [ ] Server is running
- [ ] "Gemini AI initialized successfully" in server logs
- [ ] GEMINI_API_KEY is set in `.env`
- [ ] Server was restarted after `.env` changes
- [ ] Patient ID is valid
- [ ] Discharge summary is not empty
- [ ] Internet connection is working

## Example Discharge Summary Formats

### Good Format 1:
```
Patient Name: John Doe
Medications:
- Amoxicillin 500mg three times daily for 7 days
- Ibuprofen 200mg twice daily as needed
```

### Good Format 2:
```
Prescriptions:
1. Amoxicillin 500mg - Take 3 times per day with meals for 7 days
2. Vitamin D 1000IU - Take once daily in the morning
```

### Good Format 3:
```
The patient should take Amoxicillin 500mg three times a day for one week.
Also prescribed Ibuprofen 200mg twice daily for pain management.
```

## Summary

✅ **Added better error handling** - Specific error messages
✅ **Added Gemini AI validation** - Checks if initialized
✅ **Added detailed logging** - Easier debugging
✅ **Improved error responses** - Clear error details

**Next Steps:**
1. Restart your server
2. Check server logs for "Gemini AI initialized successfully"
3. Try processing a simple discharge summary
4. Check server terminal for any error messages

If you still get errors, check the server terminal output - it will now show exactly what's failing! 🔍
