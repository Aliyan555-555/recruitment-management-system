# Fix "token.id is not a function" Error

## 🔍 Problem

The error shows:
```
TypeError: token.id is not a function
at Object.session (webpack-internal:///(rsc)/./lib/auth.ts:108:41)
```

But your `lib/auth.ts` only has 103 lines, meaning **stale/cached code is running**!

---

## ✅ Quick Fix (3 Steps)

### Step 1: Stop the Dev Server

Press `Ctrl + C` in the terminal where `npm run dev` is running.

---

### Step 2: Clear Cache and Restart

```bash
# Kill all node processes (Windows PowerShell)
Get-Process -Name node | Stop-Process -Force

# Remove Next.js cache
Remove-Item -Recurse -Force .next

# Start fresh
npm run dev
```

**Or on Command Prompt:**
```cmd
taskkill /F /IM node.exe
rmdir /s /q .next
npm run dev
```

---

### Step 3: Test Login

1. Go to: http://localhost:3000/login
2. Try logging in again
3. Should work now! ✨

---

## 🎯 Alternative: Restart Everything

If the quick fix doesn't work:

```bash
# 1. Stop server
# Press Ctrl+C

# 2. Kill all processes
Get-Process -Name node | Stop-Process -Force

# 3. Clear all caches
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# 4. Restart
npm run dev
```

---

## ✅ Your Code is Correct!

Your `lib/auth.ts` file is **already correct**. The issue is just stale cache.

The error references line 108, but your file only has 103 lines - this proves old cached code is running.

---

## 🔍 Verify the Fix

After restarting, check the terminal. You should see:

```
✓ Compiled / in XXXms
✓ Ready in XXXms
```

And when you login, you should see:
```
POST /api/auth/callback/credentials? 200 in XXXms
GET /api/auth/session 200 in XXXms
```

**No errors!** ✅

---

## 📝 Why This Happens

Next.js caches compiled code in the `.next` folder. Sometimes:
- Code changes aren't picked up
- Old versions stay in memory
- Dev server doesn't properly reload

**Solution**: Always clear `.next` when you see weird errors!

---

## 🚀 Now Try Your App

1. ✅ Login: http://localhost:3000/login
2. ✅ Profile: http://localhost:3000/profile
3. ✅ Jobs: http://localhost:3000/jobs
4. ✅ Apply for jobs!

**Everything should work perfectly now!** 🎉

---

**Quick Command:**
```bash
Get-Process -Name node | Stop-Process -Force; Remove-Item -Recurse -Force .next; npm run dev
```

