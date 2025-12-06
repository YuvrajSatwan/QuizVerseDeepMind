# Firebase Connection Troubleshooting Guide

## Quick Diagnosis

The errors you're experiencing indicate network connectivity issues with Firebase Firestore:

- `ERR_BLOCKED_BY_CLIENT`: Request blocked by browser extension or ad blocker
- `ERR_QUIC_PROTOCOL_ERROR`: Network protocol error

## Immediate Solutions

### 1. Ad Blocker Issues (Most Common)
**If you see `ERR_BLOCKED_BY_CLIENT`:**

- **Disable ad blockers temporarily** (uBlock Origin, AdBlock Plus, etc.)
- **Whitelist Firebase domains** in your ad blocker:
  - `*.googleapis.com`
  - `*.firebaseapp.com`
  - `*.firebase.googleapis.com`
- **Try incognito/private browsing mode** to test without extensions

### 2. Network Protocol Issues
**If you see `ERR_QUIC_PROTOCOL_ERROR`:**

- **Disable QUIC protocol in Chrome:**
  1. Go to `chrome://flags/#enable-quic`
  2. Set to "Disabled"
  3. Restart Chrome
- **Try a different network connection** (mobile hotspot, different WiFi)
- **Check corporate firewall settings** if on work network

### 3. Browser Extensions
- Disable all browser extensions temporarily
- Common problematic extensions:
  - Privacy Badger
  - Ghostery
  - NoScript
  - Any VPN extensions

## Using the Diagnostic Tool

Navigate to `/diagnostic` in your app to access the Firebase diagnostic tool:

```
http://localhost:5173/diagnostic
```

This tool will:
- Test Firebase connectivity
- Analyze specific errors
- Provide targeted solutions
- Generate detailed diagnostic reports

## Enhanced Error Handling

Your Firebase configuration now includes:
- **Automatic retry logic** with exponential backoff
- **Enhanced error detection** and user-friendly messages
- **Connection status monitoring**

## Testing Your Fix

1. **Open browser console** (F12 → Console tab)
2. **Navigate to your app**
3. **Watch for Firebase connection messages**
4. **Use the diagnostic tool** at `/diagnostic`

## Advanced Troubleshooting

### Network Connectivity Test
```javascript
// Test basic connectivity
fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' })
  .then(() => console.log('Internet: OK'))
  .catch(err => console.log('Internet: Failed', err))

// Test Firebase domains
fetch('https://firestore.googleapis.com', { mode: 'no-cors' })
  .then(() => console.log('Firestore: Reachable'))
  .catch(err => console.log('Firestore: Blocked', err))
```

### Firestore Security Rules
If you get permission errors, check your Firestore rules in Firebase Console:

```javascript
// Allow read/write for testing (NOT for production)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Environment-Specific Issues

**Development Environment:**
- Use Firebase emulator for offline development
- Check if running on correct port (5173 for Vite)

**Corporate Networks:**
- Whitelist Firebase domains in firewall
- Contact IT for QUIC protocol support
- Use alternative DNS (8.8.8.8, 1.1.1.1)

## Prevention

1. **Whitelist Firebase domains** in all ad blockers
2. **Use Firebase emulator** for development when possible
3. **Implement proper error handling** in all Firestore operations
4. **Monitor Firebase Status** page for service issues

## Support Resources

- [Firebase Status Page](https://status.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Chrome Network Error Reference](https://chromium.googlesource.com/chromium/src/+/master/net/base/net_error_list.h)

---

**Need immediate help?** Use the diagnostic tool at `/diagnostic` or check the browser console for real-time troubleshooting suggestions.
