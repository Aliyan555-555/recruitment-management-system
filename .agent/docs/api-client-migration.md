# API Client Migration Guide

## Why Migrate?
The new `ApiClient` provides automatic redirect on 401/403 errors, preventing users from seeing unauthorized error messages after logout.

## How to Migrate

### Before (Old Pattern):
```typescript
const response = await fetch('/api/admin/organization')
if (!response.ok) {
  throw new Error('Failed to fetch')
}
const data = await response.json()
```

### After (New Pattern):
```typescript
import ApiClient from '@/lib/api-client'

const data = await ApiClient.get('/api/admin/organization')
```

## Available Methods

### GET Request
```typescript
const data = await ApiClient.get('/api/endpoint')
```

### POST Request
```typescript
const result = await ApiClient.post('/api/endpoint', {
  key: 'value'
})
```

### PUT Request
```typescript
const result = await ApiClient.put('/api/endpoint/123', {
  key: 'updated value'
})
```

### PATCH Request
```typescript
const result = await ApiClient.patch('/api/endpoint/123', {
  key: 'partial update'
})
```

### DELETE Request
```typescript
const result = await ApiClient.delete('/api/endpoint/123')
```

### Advanced: Skip Auto-Redirect
```typescript
// For special cases where you want to handle 401 yourself
const response = await ApiClient.fetch('/api/endpoint', {
  skipAuthRedirect: true
})
```

## Migration Priority

### High Priority (Do First):
- Components in admin/* directories
- Components in interviewer/* directories
- Any component making authenticated API calls

### Low Priority:
- Public pages (already handle errors)
- One-off scripts
- Components with custom error handling

## Components Already Migrated
✅ `components/admin/Sidebar.tsx` - Organization data fetch

## Components Using ApiClient Pattern (Good Examples):
- These handle errors well but could be migrated for consistency:
  - `components/admin/AdminSearchBar.tsx`
  - `components/admin/Calendar.tsx`

## Testing After Migration
1. Logout and stay on the page
2. Try to interact with the component
3. Should redirect to login (not show errors)

## Need Help?
Refer to `lib/api-client.ts` for the full API.
