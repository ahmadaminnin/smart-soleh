# Deploying Smart Soleh to Vercel

This guide explains how to deploy Smart Soleh to Vercel with Firebase authentication.

## Prerequisites

1. A Firebase project with Google Sign-In configured (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md))
2. A Vercel account (https://vercel.com)
3. Git repository with Smart Soleh code

## Step-by-Step Deployment

### 1. Get Firebase Configuration

From your Firebase Console:
1. Go to **Project Settings** → **General** tab
2. Scroll down to find your Firebase SDK snippet
3. Copy these values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### 2. Connect Repository to Vercel

1. Go to https://vercel.com/new
2. Import your Git repository
3. Select the project and click "Continue"

### 3. Add Environment Variables

On the "Configure Project" step:

1. Click "Environment Variables"
2. Add each Firebase config as an environment variable:

| Variable Name | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | Your Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project-id.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

### 4. Configure Firebase for Vercel Domain

After Vercel builds and deploys:

1. Note your Vercel URL (e.g., `https://smart-soleh.vercel.app`)
2. Go to Firebase Console
3. Go to **Authentication** → **Settings**
4. In "Authorized domains" add:
   - `smart-soleh.vercel.app`
   - Any custom domain you'll use
5. Click "Save"

### 5. Update Google OAuth Consent Screen

1. Go to **Google Cloud Console** → **APIs & Services** → **OAuth consent screen**
2. Add your Vercel domain to the authorized redirect URIs:
   - `https://smart-soleh.vercel.app`
   - `https://smart-soleh.vercel.app/`
3. Click "Save"

### 6. Deploy

1. Click "Deploy" button
2. Wait for build to complete (should take 1-2 minutes)
3. Visit the deployed URL and test:
   - Student portal should load
   - Click "Facilitator Login" → Should open Google Sign-In popup
   - Sign in with Google
   - Should enter Facilitator Mode

## Troubleshooting

### "Firebase is not configured" error

**Check:**
1. Environment variables are set in Vercel project settings
2. Values don't have typos
3. Firebase credentials are from the correct project
4. Vercel has redeployed after env vars were added (redeploy if needed)

**Fix:**
1. Go to Vercel project settings
2. Click "Environment Variables"
3. Verify all Firebase variables are set
4. Click "Redeploy" button
5. Wait for redeploy to complete

### Google Sign-In shows "Operation not supported in this environment"

**Cause:** Domain not authorized in Firebase

**Fix:**
1. Get your Vercel URL from deployment
2. Add it to Firebase Console → Authentication → Authorized domains
3. Wait 5 minutes for changes to propagate
4. Test again

### "Unauthorized domain" error

**Cause:** Vercel domain not added to Google OAuth consent screen

**Fix:**
1. Go to Google Cloud Console
2. Find your OAuth 2.0 credential
3. Add your Vercel domain to authorized redirect URIs
4. Wait a few minutes and test again

### Environment Variables Not Loading

**Check that:**
1. Variable names start with `VITE_` (required for Vite)
2. Values don't have extra spaces
3. Special characters are properly escaped
4. Vercel has redeployed after adding variables

**To verify:**
1. Open browser DevTools → Console
2. Should see: `[Firebase] Configuration status: ✓ Loaded`
3. If not, check console errors

## Local Development

For local development, create a `.env.local` file:

```bash
cp .env.example .env.local
```

Then fill in your Firebase values in `.env.local` and run:

```bash
npm run dev
```

## Production Considerations

- **Security:** Never commit `.env.local` or Firebase keys to Git
- **Environment Isolation:** Use separate Firebase projects for dev/prod
- **Monitoring:** Set up Firebase monitoring in production
- **Backup:** Keep a copy of your Firebase config in a secure location

## Support

For issues:
- Check [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for Firebase configuration
- Check Vercel deployment logs: Vercel Dashboard → Project → Deployments → View logs
- Check browser console for Firebase initialization errors
- Verify Firebase project settings and credentials
