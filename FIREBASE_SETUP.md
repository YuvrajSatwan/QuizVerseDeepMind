# Firebase Setup Guide

## 🚨 Current Issues

### 1. Authentication Errors (PRIORITY)
- `auth/operation-not-allowed` - Email/password authentication not enabled
- `auth/popup-closed-by-user` - Google sign-in popup issues
- Authentication features not working

### 2. Quiz Creation Issues
- Firestore database may need configuration
- Security rules may need setup

Here's how to fix both issues:

## PRIORITY FIX: Enable Authentication

### 1. Enable Email/Password Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `quizverse-54259` (not `quizzer-54259`)
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Email/Password** 
5. **Toggle ON** the first option (Email/Password)
6. Click **Save**

### 2. Enable Google Sign-In
1. Still in **Sign-in method** tab
2. Click on **Google**
3. **Toggle ON** Google sign-in
4. Set your **Project support email** (use your Google account email)
5. Click **Save**

### 3. Configure Authorized Domains
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Ensure these domains are listed:
   - `localhost`
   - `127.0.0.1`
   - Your production domain (when ready)

## Secondary Fix: Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `quizzer-54259`
3. In the left sidebar, click on "Firestore Database"
4. If not already enabled, click "Create Database"
5. Choose "Start in test mode" for development (allows all reads/writes)

### 2. Deploy Security Rules (Optional)

If you want to use custom security rules:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize Firebase in your project: `firebase init firestore`
4. Deploy the rules: `firebase deploy --only firestore:rules`

### 3. Alternative: Use Test Mode

For development, you can simply enable "test mode" in the Firebase Console:
1. Go to Firestore Database
2. Click on "Rules" tab
3. Make sure the rules allow read/write access

### 4. Verify Configuration

After setup, the quiz creation should work. Check the browser console for any error messages.

### Common Issues:

1. **"Missing or insufficient permissions"**: Firestore security rules are too restrictive
2. **"Firestore is not enabled"**: Need to enable Firestore in Firebase Console
3. **Network errors**: Check internet connection and Firebase project configuration

### Production Security Rules

For production, replace the permissive rules with proper authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /quizzes/{quizId} {
      allow read, write: if request.auth != null;
    }
  }
}
```
