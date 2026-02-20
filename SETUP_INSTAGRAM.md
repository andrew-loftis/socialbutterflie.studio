# Instagram/Facebook OAuth Setup for Social Butterflie

## Overview
This guide will help you set up Instagram and Facebook integration for Social Butterflie.

## Prerequisites
- Facebook account
- Instagram account (for testing)
- Your app contact email: **aloft2@gmail.com**

---

## Step 1: Create Facebook App

1. **Go to**: [developers.facebook.com](https://developers.facebook.com)
2. **Sign in** with your Facebook account
3. **Click**: "My Apps" (top right) → "Create App"
4. **Select**: "Business" as the app type
5. **Fill in the details**:
   - **App Name**: `Social Butterflie`
   - **App Contact Email**: `aloft2@gmail.com`
   - **Business Portfolio**: (Select existing or create new)
6. **Click**: "Create App"
7. **Complete Security Check** if prompted

---

## Step 2: Configure Facebook Login

1. In your app dashboard, scroll to **"Add products to your app"**
2. Find **"Facebook Login"** and click **"Set Up"**
3. **Select**: "Web" as the platform
4. **Skip the quickstart** (click "Settings" in left sidebar under Facebook Login)
5. In **"Valid OAuth Redirect URIs"**, add:
   ```
   https://shimmering-alpaca-782093.netlify.app/.netlify/functions/auth
   http://localhost:8888/.netlify/functions/auth
   ```
6. **Save Changes**

---

## Step 3: Add Instagram Basic Display

1. In the left sidebar, click **"Add Product"**
2. Find **"Instagram Basic Display"** and click **"Set Up"**
3. Scroll down to **"User Token Generator"** section
4. Click **"Create New App"** under Instagram App
5. Fill in:
   - **Display Name**: `Social Butterflie`
   - **Valid OAuth Redirect URIs**:
     ```
     https://shimmering-alpaca-782093.netlify.app/.netlify/functions/auth
     ```
   - **Deauthorize Callback URL**: `https://shimmering-alpaca-782093.netlify.app/.netlify/functions/auth`
   - **Data Deletion Request URL**: `https://shimmering-alpaca-782093.netlify.app/.netlify/functions/auth`
6. **Save Changes**

---

## Step 4: Add Instagram Testers

1. Under **"Instagram Basic Display"** → **"User Token Generator"**
2. Click **"Add or Remove Instagram Testers"**
3. Click **"Add Instagram Testers"** button
4. Enter your Instagram username
5. **On Instagram**: Go to Settings → Apps and Websites → Tester Invites
6. **Accept** the invite from Social Butterflie

---

## Step 5: Get App Credentials

1. In left sidebar, go to **Settings** → **Basic**
2. Copy these values:
   - **App ID**: (e.g., `123456789012345`)
   - **App Secret**: Click "Show" button, then copy

---

## Step 6: Set Netlify Environment Variables

Open PowerShell and run:

```powershell
cd c:\Users\aloft\Downloads\pixl-social\pixl-social

# Replace with your actual App ID and Secret
netlify env:set FB_APP_ID "YOUR_APP_ID_HERE"
netlify env:set FB_APP_SECRET "YOUR_APP_SECRET_HERE"
```

---

## Step 7: Redeploy (Important!)

After setting environment variables, you MUST redeploy:

```powershell
netlify deploy --prod
```

---

## Step 8: Test the Connection

1. Go to: https://shimmering-alpaca-782093.netlify.app/profile.html
2. Click **"New Group"** to create an account group
3. Click **"Add Account"** on the group
4. Select **Instagram** or **Facebook**
5. Log in when prompted
6. Authorize Social Butterflie

---

## Troubleshooting

### "Invalid App ID" Error
- Double-check your `FB_APP_ID` in Netlify
- Make sure you deployed after setting env vars

### "Redirect URI Mismatch" Error
- Verify the redirect URI in Facebook App settings exactly matches:
  `https://shimmering-alpaca-782093.netlify.app/.netlify/functions/auth`

### Instagram Not Showing in Tester Invites
- Wait a few minutes (can take 5-10 minutes)
- Check Instagram app notifications
- Go to Settings → Security → Apps and Websites

### Connection Not Saving
- Check browser console (F12) for errors
- Verify Supabase is configured (or data will be temporary)

---

## Required Permissions

**Facebook Login Permissions:**
- `public_profile`
- `email`
- `pages_show_list` (for Facebook Pages)
- `pages_read_engagement`

**Instagram Basic Display Permissions:**
- `instagram_basic`
- `instagram_content_publish`

---

## App Review (For Production)

For public launch, you'll need to submit your app for review:
1. Go to **App Review** → **Permissions and Features**
2. Request these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`
3. Provide screencast demo of your app
4. Explain use case: "Social media scheduling and analytics tool"

**Note**: During development, you can test with up to 5 Instagram accounts added as testers.

---

## Support

Issues? Contact: aloft2@gmail.com
