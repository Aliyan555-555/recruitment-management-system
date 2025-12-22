# Authentication & Session Management Fix

## Problem
Users were experiencing the following issue:
1. After logging out, users remained on the admin dashboard
2. API calls would throw unauthorized (401) errors
3. Users would see error messages instead of being redirected to login
4. The session was invalidated but the UI didn't react to the change

## Root Cause
The application lacked:
1. **Global session monitoring** - Layout components weren't checking session status
2. **API error handling** - No centralized handling of 401/403 errors
3. **Client-side redirects** - No automatic redirect when session expires or user logs out

## Solution Implemented

### 1. Session Monitoring in Layouts ✅

**Updated Files:**
- `components/admin/AdminLayout.tsx`
- `app/interviewer/layout.tsx`

**What was added:**
```tsx
const { data: session, status } = useSession()
const router = useRouter()

useEffect(() => {
  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    router.push("/login")
  }
  
  // Check if user has correct role
  if (status === "authenticated" && session?.user?.role !== "ADMIN") {
    router.push("/unauthorized")
  }
}, [status, session, router])
```

**Benefits:**
- ✅ Automatically detects when session expires
- ✅ Redirects to login immediately after logout
- ✅ Validates user role on every route
- ✅ Shows loading state during authentication check

### 2. Global API Client ✅

**New File:** `lib/api-client.ts`

**Features:**
- Automatic 401/403 error detection
- Client-side redirect to login
- Preserves callback URL for post-login redirect
- Prevents unauthorized error messages

**Usage:**
```typescript
import ApiClient from '@/lib/api-client'

// Instead of:
const response = await fetch('/api/admin/organization')
const data = await response.json()

// Use:
const data = await ApiClient.get('/api/admin/organization')
```

### 3. Improved Error Handling in Components ✅

**Updated Files:**
- `components/admin/Sidebar.tsx`

**Changes:**
- Added proper error handling with try/catch
- Silent failures (logged to console.debug)
- Cleanup with component unmount handling
- Let session monitoring handle redirects

## How It Works Now

### Logout Flow:
1. User clicks "Logout" button
2. `signOut({ callbackUrl: "/login" })` is called
3. Session is invalidated
4. Layout detects `status === "unauthenticated"`
5. User is immediately redirected to `/login`
6. No API errors are shown to the user

### Session Expiry Flow:
1. User's session expires (after 30 days by default)
2. Any API call returns 401
3. Layout's `useSession` hook detects expiry
4. `status` changes to "unauthenticated"
5. useEffect triggers redirect to login
6. User sees loading state, then login page

### Protected Route Access:
1. Unauthenticated user tries to access `/admin/dashboard`
2. Layout loads with `status === "loading"`
3. Shows loading spinner
4. Once checked, `status === "unauthenticated"`
5. Redirect to `/login?callbackUrl=/admin/dashboard`
6. After login, user returns to dashboard

## Testing Checklist

- [ ] Login as admin → Logout → Should redirect to /login
- [ ] Login as interviewer → Logout → Should redirect to /login
- [ ] Access /admin/dashboard without login → Should redirect to /login
- [ ] Login → Wait for session expiry → Should auto-redirect
- [ ] Login as candidate → Try to access /admin → Should show unauthorized
- [ ] API 401 error → Should redirect to login (not show error)

## Configuration

### Session Duration
Location: `lib/auth.ts`
```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days - modify as needed
}
```

### Login Redirect Pages
Location: `lib/auth.ts`
```typescript
pages: {
  signIn: '/login',      // Change login page here
  error: '/login',       // Error page
}
```

## Migration Guide

If you have other components making API calls, update them:

### Before:
```typescript
const response = await fetch('/api/some-endpoint')
const data = await response.json()
```

### After (Option 1 - Recommended):
```typescript
import ApiClient from '@/lib/api-client'
const data = await ApiClient.get('/api/some-endpoint')
```

### After (Option 2 - Manual handling):
```typescript
try {
  const response = await fetch('/api/some-endpoint')
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Let the layout handle the redirect
      return
    }
    throw new Error('API error')
  }
  const data = await response.json()
} catch (error) {
  console.debug('API call failed:', error)
}
```

## Future Improvements

1. **Token Refresh** - Implement automatic token refresh before expiry
2. **Activity Tracking** - Track user activity to extend session
3. **Session Warning** - Show warning before session expires
4. **Offline Mode** - Handle offline scenarios gracefully
5. **Global Error Boundary** - Catch and handle all React errors

## Related Files

- `lib/auth.ts` - NextAuth configuration
- `middleware.ts` - Route protection
- `app/providers.tsx` - SessionProvider wrapper
- `components/admin/AdminLayout.tsx` - Admin session monitoring
- `app/interviewer/layout.tsx` - Interviewer session monitoring
- `lib/api-client.ts` - Global API client with error handling

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify session status in React DevTools
3. Check Network tab for 401 responses
4. Ensure NEXTAUTH_SECRET is set in .env
