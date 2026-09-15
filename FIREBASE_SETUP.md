# Firebase Setup Guide for Smart Soleh

This guide explains how to configure Firebase and Google Sign-In for the Smart Soleh application.

## Overview

Smart Soleh uses Firebase for:
- **Authentication** (Firebase Auth with Google Sign-In)
- **Database** (Firestore for storing modules, topics, and settings)
- **Storage** (Firebase Storage for images, currently using Base64 as fallback)

## Prerequisites

1. A Google Cloud Project
2. A Firebase Project (linked to your Google Cloud Project)
3. Admin access to Firebase Console

## Step-by-Step Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Enable Google Analytics (optional but recommended)
4. Click "Create project"

### 2. Register Your Web App

1. In the Firebase Console, click "Add app" → select "Web" (</>)
2. Enter an app nickname (e.g., "Smart Soleh")
3. Click "Register app"
4. Copy the Firebase configuration object (looks like):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxx",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 3. Enable Authentication Methods

1. Go to **Authentication** → **Sign-in method**
2. Click "Google" and enable it
3. Select a project support email
4. Click "Save"

### 4. Configure OAuth Consent Screen

1. Go to **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**
2. Select "External" user type (or "Internal" if your domain allows)
3. Fill in the required information:
   - App name: "Smart Soleh"
   - User support email: your email
   - Developer contact: your email
4. Click "Save and Continue"
5. On the "Scopes" step, click "Save and Continue" (use default scopes)
6. On the "Test users" step, add your email as a test user
7. Click "Save and Continue" and then "Back to Dashboard"

### 5. Add Authorized Redirect URIs

1. In **Google Cloud Console** → **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID (of type "Web application")
3. Click it to edit
4. Add authorized redirect URIs:
   - `http://localhost:5173`
   - `http://localhost:5174`
   - `http://localhost:3000`
   - Your production domain (e.g., `https://smart-soleh.example.com`)
5. Click "Save"

### 6. Configure Firestore Database

1. Go to **Firestore Database** in Firebase Console
2. Click "Create database"
3. Choose location (closest to your users)
4. Start in **test mode** (for development) or **production mode** (with security rules)
5. Click "Create"

### 7. Set Firebase Configuration in Smart Soleh

You have two options:

#### Option A: Environment Variables (Recommended)

Create a `.env.local` file in the project root:

```bash
VITE_FIREBASE_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Then update `index.html` to inject these:

```html
<script>
  window.__firebase_config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
</script>
```

#### Option B: Direct Configuration (For Testing)

Add directly to `index.html`:

```html
<script>
  window.__firebase_config = {
    apiKey: "AIzaSyDxxxxxxxxxxxxxxxxxx",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
  };
</script>
```

### 8. Set Up Firestore Security Rules (Optional but Recommended)

1. In **Firestore Database** → **Rules**
2. Update with appropriate security rules. Example for demo:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their data
    match /artifacts/{appId}/public/{document=**} {
      allow read, write: if request.auth != null;
    }
    // Allow anonymous access in development
    match /artifacts/{appId}/public/{document=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Demo Mode

If Firebase is not configured, Smart Soleh automatically enters **Demo Mode**:
- You can still use Facilitator mode without Google Sign-In
- Topics and modules are saved to browser `localStorage`
- Data is lost when you clear browser cache
- A "DEMO MODE" badge appears in the navigation

### Why Demo Mode?

Demo Mode allows users to:
- Test the application without Firebase setup
- Work offline with local storage
- Develop features without cloud configuration

## Troubleshooting

### Google Sign-In Shows "Not Supported in This Environment"

**Cause**: Firebase authentication is not properly initialized.

**Fix**:
1. Verify `window.__firebase_config` is set in `index.html`
2. Check browser console for Firebase initialization errors
3. Ensure Firebase project has Google as a sign-in method

### Popup Blocker Blocks Sign-In

**Cause**: Browser popup blocker is preventing the sign-in popup.

**Fix**:
1. Allow popups for the website
2. Click sign-in button again
3. Use an incognito/private window

### "Request denied" When Creating Topics

**Cause**: Firestore rules don't allow write access.

**Fix**:
1. Check Firestore security rules
2. Ensure user is authenticated or rules allow anonymous writes
3. Verify the document path matches the rules

### Topics Not Appearing in Module Builder

**Cause**: Topics not synced properly between local and Firestore.

**Fix**:
1. Check browser `localStorage` for `smart_soleh_demo_topics`
2. Clear browser cache and reload
3. Check Firestore console to verify topics are saved

## Production Deployment

For production:

1. **Use environment variables** - Never hardcode API keys in source code
2. **Enable production Firestore rules** - Restrict access appropriately
3. **Set up HTTPS** - Google Sign-In requires HTTPS in production
4. **Configure authorized domains** - Add your production domain to Firebase
5. **Enable monitoring** - Set up Firebase monitoring and analytics

## Support

For issues:
- Check [Firebase Documentation](https://firebase.google.com/docs)
- Review [Google Cloud Console](https://console.cloud.google.com)
- Check browser console for detailed error messages
