# Troubleshooting Guide - Authentication & Logout

## Common Issues & Solutions

### Issue 1: User Not Redirected After Logout
**Symptoms:**
- User clicks logout but stays on admin page
- Sees "Loading..." indefinitely

**Possible Causes:**
1. SessionProvider not wrapping the app
2. useSession hook not being called
3. Router not working

**Solution:**
```typescript
// Check app/providers.tsx has SessionProvider
<SessionProvider>
  <ThemeProvider>
    {children}
  </ThemeProvider>
</SessionProvider>

// Check AdminLayout is using useSession
const { data: session, status } = useSession()
```

**Verify:**
1. Open React DevTools
2. Check if SessionProvider is present
3. Check session status value

---

### Issue 2: Still Seeing 401 Errors
**Symptoms:**
- User gets redirected but sees error toasts/alerts
- Console shows unauthorized errors

**Possible Causes:**
1. Component is not using ApiClient
2. Component making API call before redirect completes
3. Error handling showing user-facing messages

**Solution:**
Update component to use ApiClient or improve error handling:

```typescript
// Option 1: Use ApiClient
import ApiClient from '@/lib/api-client'
const data = await ApiClient.get('/api/endpoint')

// Option 2: Silent error handling
try {
  const res = await fetch('/api/endpoint')
  if (!res.ok) throw new Error()
  const data = await res.json()
} catch (error) {
  console.debug('API call failed:', error) // Debug only, not user-facing
}
```

---

### Issue 3: Infinite Redirect Loop
**Symptoms:**
- Page keeps redirecting between /login and /admin
- Browser console shows multiple navigation attempts

**Possible Causes:**
1. Middleware and layout both trying to redirect
2. Login page wrapped in protected layout
3. Session status not stable

**Solution:**
Check that login page bypasses protected layout:

```typescript
// In app/admin/layout.tsx
const pathname = usePathname()

if (pathname === "/admin/login") {
  return <>{children}</>  // Skip protected layout
}

return <AdminLayout>{children}</AdminLayout>
```

---

### Issue 4: Session Not Detected as Expired
**Symptoms:**
- User stays logged in forever
- Can access admin even after session should expire

**Possible Causes:**
1. Session maxAge too long
2. Token refresh logic interfering
3. Browser caching

**Solution:**
Check session configuration in `lib/auth.ts`:

```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days - adjust as needed
}
```

Clear browser cache and test again.

---

### Issue 5: Role Validation Not Working
**Symptoms:**
- Non-admin users can access admin pages
- Unauthorized users not redirected

**Possible Causes:**
1. Role not set in session
2. Role check logic incorrect
3. Middleware not running

**Solution:**
Verify role is in session token:

```typescript
// lib/auth.ts - Check JWT callback
async jwt({ token, user }) {
  if (user) {
    token.role = user.role  // ← Must be set!
  }
  return token
}

// AdminLayout - Check role validation
if (status === "authenticated" && session?.user?.role !== "ADMIN") {
  router.push("/unauthorized")
}
```

**Debug:**
```typescript
console.log('Session:', session)
console.log('User role:', session?.user?.role)
```

---

### Issue 6: Loading State Never Ends
**Symptoms:**
- Spinner shows forever
- Page doesn't render

**Possible Causes:**
1. useSession status stuck on "loading"
2. NextAuth not configured properly
3. Database connection issue

**Solution:**
Check NextAuth configuration:

```typescript
// lib/auth.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET, // Must be set!
  // ... other config
})
```

**Verify:**
1. Check `.env` has `NEXTAUTH_SECRET`
2. Restart development server
3. Check database connection

---

### Issue 7: Callback URL Not Working
**Symptoms:**
- After login, user goes to wrong page
- Loses intended destination

**Possible Causes:**
1. callbackUrl not being passed
2. ApiClient not preserving path
3. Middleware overriding

**Solution:**
Ensure ApiClient captures current path:

```typescript
// In ApiClient
if (response.status === 401) {
  const currentPath = window.location.pathname
  window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`
}
```

**Verify:**
Check URL after redirect: `/login?callbackUrl=/admin/dashboard`

---

## Debug Checklist

When troubleshooting authentication issues, check these in order:

- [ ] `NEXTAUTH_SECRET` is set in `.env`
- [ ] SessionProvider wraps the app in `app/providers.tsx`
- [ ] Layout uses `useSession()` hook
- [ ] useEffect has proper dependencies `[status, session, router]`
- [ ] Session status is one of: "loading", "authenticated", "unauthenticated"
- [ ] User role is correctly set in JWT token
- [ ] Middleware is not interfering with redirects
- [ ] Browser has no cached authentication state
- [ ] Console shows no React hydration errors

## Testing Commands

### Check Session Status
```typescript
// Add to any component
const { data: session, status } = useSession()
console.log('Status:', status)
console.log('Session:', session)
```

### Force Logout
```typescript
// Run in browser console
signOut({ callbackUrl: '/login' })
```

### Clear All Sessions
```bash
# Clear browser storage
localStorage.clear()
sessionStorage.clear()
```

## Environment Variables

Required in `.env`:
```bash
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

Optional:
```bash
NEXTAUTH_DEBUG=true  # Enable debug logs
```

## Logs to Check

### Client-side
- Browser console for React errors
- Network tab for API responses
- Application tab for session storage

### Server-side
- Terminal for NextAuth debug logs
- API route logs for 401 responses
- Middleware logs for route protection

## Getting More Help

1. Check full documentation: `.agent/docs/authentication-fix.md`
2. Review flow diagrams: `.agent/docs/authentication-flows.md`
3. Migration guide: `.agent/docs/api-client-migration.md`
4. Open browser DevTools and check:
   - Console for errors
   - Network for failed requests
   - React DevTools for component state

## Contact Points

If issue persists:
1. Capture browser console logs
2. Note exact steps to reproduce
3. Check which files were modified
4. Verify all changes were applied correctly
