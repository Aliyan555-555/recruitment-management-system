# 🔐 Authentication Quick Reference

## The Problem
```
❌ User clicks logout → Stays on admin page → Sees 401 errors
```

## The Solution
```
✅ User clicks logout → Immediately redirected to login → Clean UX
```

## How It Works

### 1. Session Monitoring (Layout)
```typescript
const { status } = useSession()

useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/login")  // Auto-redirect!
  }
}, [status])
```

### 2. API Error Handling (ApiClient)
```typescript
// Automatically redirects on 401/403
const data = await ApiClient.get('/api/endpoint')
```

## Quick Commands

### Test Logout
1. Login as admin
2. Click logout button
3. Should redirect to `/login` immediately
4. No error messages

### Check Session
```typescript
const { data: session, status } = useSession()
console.log(status) // "loading" | "authenticated" | "unauthenticated"
```

### Force Logout (Browser Console)
```typescript
signOut({ callbackUrl: '/login' })
```

## Files Changed
✅ `components/admin/AdminLayout.tsx`  
✅ `app/interviewer/layout.tsx`  
✅ `components/admin/Sidebar.tsx`  
✅ `lib/api-client.ts` (new)

## Common Issues

### Still seeing errors?
→ Check: Is SessionProvider wrapping app?  
→ Check: Is useSession() being called?  
→ Clear browser cache

### Not redirecting?
→ Check: Is NEXTAUTH_SECRET set in .env?  
→ Check: Is useEffect dependency array correct?  
→ Restart dev server

### Infinite redirects?
→ Check: Login page bypasses protected layout  
→ Check: Middleware not conflicting

## API Usage Pattern

### ❌ Old Way
```typescript
const res = await fetch('/api/data')
const data = await res.json()
// If 401: User sees error!
```

### ✅ New Way
```typescript
import ApiClient from '@/lib/api-client'
const data = await ApiClient.get('/api/data')
// If 401: Auto-redirect to login!
```

## Session Configuration
Location: `lib/auth.ts`

```typescript
session: {
  maxAge: 30 * 24 * 60 * 60, // 30 days
}

pages: {
  signIn: '/login',
}
```

## Debug Checklist
- [ ] NEXTAUTH_SECRET in .env?
- [ ] SessionProvider in app?
- [ ] useSession() in layout?
- [ ] Session status correct?
- [ ] Browser cache cleared?

## Documentation
📖 Full details: `.agent/docs/README-auth.md`  
🔄 Flow diagrams: `.agent/docs/authentication-flows.md`  
🔧 Migration guide: `.agent/docs/api-client-migration.md`  
🔍 Troubleshooting: `.agent/docs/auth-troubleshooting.md`

---
✨ **Quick tip:** The session monitoring in layouts is your safety net. Even if API calls fail, the layout will catch it and redirect!
