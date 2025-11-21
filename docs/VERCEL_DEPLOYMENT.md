# Vercel Deployment Guide

## Fixing NextAuth Session Error on Vercel

If you're seeing the error: **"There was a problem with the server configuration. Check the server logs for more information."** when accessing `/api/auth/session`, follow these steps:

---

## ✅ Step 1: Set Environment Variables on Vercel

1. **Go to your Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your project

2. **Navigate to Settings → Environment Variables**

3. **Add the following required variables:**

   ### Required Variables:

   ```
   NEXTAUTH_SECRET
   ```
   - **Value**: Generate a secure random string (at least 32 characters)
   - **Generate one using:**
     ```bash
     openssl rand -base64 32
     ```
     Or visit: https://generate-secret.vercel.app/32

   ```
   NEXTAUTH_URL
   ```
   - **Value**: Your production URL
   - **If using Vercel's default domain:**
     ```
     https://your-project-name.vercel.app
     ```
   - **If using a custom domain:**
     ```
     https://yourdomain.com
     ```
   - **If using IP address (like `http://139.59.111.79:3001`):**
     ```
     http://139.59.111.79:3001
     ```
     ⚠️ **Note**: Using IP addresses is not recommended for production. Use a proper domain with HTTPS.

   ```
   DATABASE_URL
   ```
   - **Value**: Your PostgreSQL connection string
   - Example: `postgresql://user:password@host:5432/database?schema=public`

4. **Select Environment**
   - Check **Production**, **Preview**, and **Development** (or at least Production)
   - Click **Save**

---

## ✅ Step 2: Redeploy Your Application

After adding environment variables:

1. **Option A: Automatic Redeploy**
   - Push a new commit to trigger a redeploy
   - Or make a small change and commit

2. **Option B: Manual Redeploy**
   - Go to **Deployments** tab
   - Click the **⋯** (three dots) on the latest deployment
   - Select **Redeploy**

---

## ✅ Step 3: Verify the Fix

1. **Check Vercel Logs**
   - Go to **Deployments** → Select your deployment → **View Function Logs**
   - Look for any errors related to NextAuth

2. **Test the Session Endpoint**
   - Visit: `https://your-domain.com/api/auth/session`
   - Should return: `{"user":null}` or session data (not an error)

3. **Test Login**
   - Try logging in through your application
   - Should redirect properly after authentication

---

## 🔧 What Was Fixed

The NextAuth configuration has been updated with:

1. **`trustHost: true`** - Required for Vercel and serverless platforms
2. **`basePath: "/api/auth"`** - Explicitly sets the auth route path
3. **Environment variable validation** - Ensures `NEXTAUTH_SECRET` is set

---

## 🚨 Common Issues

### Issue: Still getting configuration error

**Solution:**
- Double-check that `NEXTAUTH_SECRET` is set (must be at least 32 characters)
- Verify `NEXTAUTH_URL` matches your actual production URL exactly
- Make sure you redeployed after adding environment variables
- Check Vercel logs for specific error messages

### Issue: Session works locally but not on Vercel

**Solution:**
- Ensure environment variables are set in Vercel (not just in local `.env`)
- Verify `NEXTAUTH_URL` is set to your Vercel domain (not `localhost`)
- Check that the environment variables are enabled for **Production** environment

### Issue: Using IP address instead of domain

**Solution:**
- Set up a custom domain in Vercel
- Or use Vercel's default `.vercel.app` domain
- Update `NEXTAUTH_URL` to match your domain
- IP addresses are not recommended for production

---

## 📝 Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `NEXTAUTH_SECRET` - Secure random string (32+ characters)
- [ ] `NEXTAUTH_URL` - Your production URL (with protocol: `https://` or `http://`)
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] All variables are set for **Production** environment
- [ ] Application has been redeployed after adding variables

---

## 🔗 Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [NextAuth v5 on Vercel](https://authjs.dev/getting-started/installation)

---

## 💡 Quick Test Command

After deployment, test your session endpoint:

```bash
curl https://your-domain.com/api/auth/session
```

Should return JSON (not an error page).

