# Authentication Flow - Visual Guide

## BEFORE THE FIX ❌

```
┌─────────────────────────────────────────────────────────────┐
│  User clicks "Logout"                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Session invalidated by NextAuth                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ❌ User still sees admin dashboard                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Components make API calls (Sidebar, etc.)                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ❌ API returns 401 Unauthorized                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ❌ User sees error messages in console                     │
│  ❌ Page shows broken state                                 │
│  ❌ No redirect happens                                     │
└─────────────────────────────────────────────────────────────┘
```

## AFTER THE FIX ✅

### Flow 1: User-Initiated Logout

```
┌─────────────────────────────────────────────────────────────┐
│  User clicks "Logout" button                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  signOut({ callbackUrl: "/login" }) called                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Session invalidated by NextAuth                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  AdminLayout's useSession() detects change                  │
│  status: "authenticated" → "unauthenticated"                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  useEffect hook fires                                       │
│  if (status === "unauthenticated") {                        │
│    router.push("/login")                                    │
│  }                                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ✅ User immediately redirected to /login                   │
│  ✅ No API calls made                                       │
│  ✅ No error messages shown                                 │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: Session Expiry

```
┌─────────────────────────────────────────────────────────────┐
│  User session expires (after 30 days)                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  User tries to access /admin/dashboard                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  AdminLayout loads with useSession()                        │
│  status: "loading" → "unauthenticated"                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Shows loading spinner briefly                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  useEffect detects unauthenticated                          │
│  router.push("/login")                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ✅ User redirected to /login                               │
│  ✅ Smooth transition, no errors                            │
└─────────────────────────────────────────────────────────────┘
```

### Flow 3: API Call Returns 401 (Fallback)

```
┌─────────────────────────────────────────────────────────────┐
│  Component makes API call using raw fetch                   │
│  (e.g., legacy component not yet using ApiClient)           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  API returns 401 Unauthorized                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Error caught in try/catch                                  │
│  Logged to console.debug (not shown to user)                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  AdminLayout's session monitoring kicks in                  │
│  Detects unauthenticated status                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ✅ Redirect to /login                                      │
│  ✅ User doesn't see error toast/message                    │
└─────────────────────────────────────────────────────────────┘
```

### Flow 4: Using ApiClient (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│  Component makes API call via ApiClient                     │
│  const data = await ApiClient.get('/api/admin/org')         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ApiClient.fetch() called                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  API returns 401/403                                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ApiClient detects auth error                               │
│  if (response.status === 401 || response.status === 403)   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  window.location.href = /login?callbackUrl=...              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  ✅ Immediate redirect to login                             │
│  ✅ Callback URL preserved                                  │
│  ✅ Zero error messages to user                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### AdminLayout (Session Guard)
```typescript
const { data: session, status } = useSession()
const router = useRouter()

useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/login")  // ← Automatic redirect!
  }
  
  if (status === "authenticated" && session?.user?.role !== "ADMIN") {
    router.push("/unauthorized")
  }
}, [status, session, router])
```

### ApiClient (Error Handler)
```typescript
static async fetch(url: string, options: FetchOptions = {}) {
  const response = await fetch(url, fetchOptions)

  if (!skipAuthRedirect && (response.status === 401 || response.status === 403)) {
    // Redirect to login immediately
    window.location.href = `/login?callbackUrl=${currentPath}`
    throw new Error('Unauthorized')
  }

  return response
}
```

## Benefits Summary

✅ **Automatic Redirect** - No manual redirect logic needed  
✅ **Clean User Experience** - No error messages  
✅ **Loading States** - Smooth transitions  
✅ **Role Validation** - Extra security layer  
✅ **Callback URLs** - Return to intended page after login  
✅ **Centralized Logic** - One place to manage auth errors  
✅ **Type Safety** - TypeScript support throughout  

## Configuration

Session duration: `30 days` (configurable in `lib/auth.ts`)  
Login page: `/login` (configurable in `lib/auth.ts`)  
Auto-redirect: `ON` (can be disabled per-request with `skipAuthRedirect: true`)
