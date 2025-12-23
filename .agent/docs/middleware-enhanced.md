# Enhanced Middleware Documentation

## Overview
The middleware provides comprehensive security, authentication, and role-based access control (RBAC) for the Recruitment Management System.

## Key Features

### 1. **Role-Based Access Control (RBAC)**
- **ADMIN**: Full system access
  - All admin routes (`/admin/*`)
  - Dashboard, jobs, candidates, users, workflows, settings
  - Can also access interviewer and candidate routes

- **INTERVIEWER**: Interview management access
  - Dashboard (`/interviewer/dashboard`)
  - Assignments (`/interviewer/assignments`)
  - Batches (`/interviewer/batches`)
  - Calendar (`/interviewer/calendar`)
  - Admins can also access these routes

- **CANDIDATE**: Profile and application access
  - Profile management (`/candidate/profile`)
  - Job applications (`/applications`)
  - Public job viewing
  - Admins can also access candidate routes

### 2. **Security Headers**
The middleware automatically adds security headers to all responses:

```typescript
X-Frame-Options: DENY // Prevents clickjacking
X-Content-Type-Options: nosniff // Prevents MIME sniffing
Referrer-Policy: strict-origin-when-cross-origin // Controls referer info
X-XSS-Protection: 1; mode=block // Enables XSS protection
```

### 3. **Public Routes**
The following routes are accessible without authentication:
- `/` - Home page
- `/login` - Candidate login
- `/register` - Candidate registration
- `/admin/login` - Admin login
- `/interviewer/login` - Interviewer login
- `/forgot-password` - Password recovery
- `/reset-password/*` - Password reset pages
- `/jobs` - Public job listings
- `/auth/*` - Authentication routes
- `/about` - About page
- `/contact` - Contact page
- `/unauthorized` - Unauthorized access page

### 4. **Smart Redirects**
When unauthorized access is attempted, users are redirected intelligently:

**Not Authenticated:**
- Admin routes → `/admin/login`
- Interviewer routes → `/interviewer/login`
- Candidate routes → `/login`

**Wrong Role:**
- ADMIN attempting candidate route → `/admin/dashboard`
- INTERVIEWER attempting admin route → `/interviewer/dashboard`
- CANDIDATE attempting admin route → `/candidate/profile`

### 5. **Development Features**
In development mode, the middleware adds debug headers:
- `X-User-Role`: Current user's role
- `X-User-Id`: Current user's ID

## Route Protection Matrix

| Route Pattern | ADMIN | INTERVIEWER | CANDIDATE | Public |
|--------------|-------|-------------|-----------|--------|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/login` | ✅ | ✅ | ✅ | ✅ |
| `/register` | ✅ | ✅ | ✅ | ✅ |
| `/jobs` | ✅ | ✅ | ✅ | ✅ |
| `/admin/*` | ✅ | ❌ | ❌ | ❌ |
| `/interviewer/*` | ✅ | ✅ | ❌ | ❌ |
| `/candidate/*` | ✅ | ❌ | ✅ | ❌ |
| `/profile/*` | ✅ | ❌ | ✅ | ❌ |
| `/applications/*` | ✅ | ❌ | ✅ | ❌ |

## Architecture

### Route Configuration Structure
```typescript
interface RouteConfig {
  pattern: RegExp           // RegEx pattern to match routes
  allowedRoles: UserRole[]  // Roles that can access
  requireAuth: boolean      // Whether authentication is required
  redirectTo?: string       // Custom redirect for unauthorized access
}
```

### Flow Diagram
```
Request → Middleware
    ↓
Is Static Asset? → YES → Allow
    ↓ NO
Is Public Route? → YES → Allow
    ↓ NO
Get Auth Token
    ↓
Find Route Config
    ↓
Requires Auth? → NO → Allow
    ↓ YES
Has Token? → NO → Redirect to Login
    ↓ YES
Has Required Role? → NO → Redirect to Dashboard
    ↓ YES
Add Security Headers → Allow
```

## Configuration

### Matcher Configuration
The middleware runs on all routes except:
- API routes (`/api/*`)
- Static files (`/_next/static/*`)
- Image optimization (`/_next/image/*`)
- Favicon and other static assets
- Files with extensions (`.svg`, `.png`, `.jpg`, etc.)

### Environment Variables Required
```env
NEXTAUTH_SECRET=your-secret-key-here
```

## Usage Examples

### Adding a New Protected Route
```typescript
// In the PROTECTED_ROUTES array
{
  pattern: /^\/admin\/reports/,
  allowedRoles: [UserRole.ADMIN],
  requireAuth: true,
  redirectTo: '/admin/login'
}
```

### Adding a New Public Route
```typescript
// In the PUBLIC_ROUTES array
const PUBLIC_ROUTES = [
  // ... existing routes
  '/new-public-page',
]
```

### Adding Multi-Role Access
```typescript
{
  pattern: /^\/shared-resource/,
  allowedRoles: [UserRole.ADMIN, UserRole.INTERVIEWER],
  requireAuth: true,
  redirectTo: '/login'
}
```

## Best Practices

### 1. **Least Privilege Principle**
Always assign the minimum required roles for a route.

### 2. **Defense in Depth**
Middleware is the first layer of security. Always validate permissions in:
- API routes
- Server components
- Database queries

### 3. **Specific Patterns First**
Order route configurations from most specific to least specific:
```typescript
// ✅ GOOD
/^\/admin\/jobs\/\d+\/edit$/  // Specific
/^\/admin\/jobs/               // General
/^\/admin/                     // Generic

// ❌ BAD (generic pattern catches all)
/^\/admin/
/^\/admin\/jobs/
/^\/admin\/jobs\/\d+\/edit$/
```

### 4. **Testing**
Test each role's access to ensure proper protection:
```bash
# As ADMIN
✅ /admin/dashboard
✅ /interviewer/assignments
✅ /candidate/profile

# As INTERVIEWER
❌ /admin/dashboard (redirects to /interviewer/dashboard)
✅ /interviewer/assignments
❌ /candidate/profile (redirects to /interviewer/dashboard)

# As CANDIDATE
❌ /admin/dashboard (redirects to /candidate/profile)
❌ /interviewer/assignments (redirects to /candidate/profile)
✅ /candidate/profile
```

## Security Considerations

### 1. **Session Security**
- Sessions are validated on every request
- Invalid/expired tokens redirect to login
- Tokens are verified using `NEXTAUTH_SECRET`

### 2. **CSRF Protection**
- Built into Next.js with NextAuth
- All state-changing operations should use POST/PUT/DELETE

### 3. **XSS Protection**
- Security headers prevent many XSS attacks
- Always sanitize user input in components

### 4. **Role Validation**
- Never trust client-side role information
- Always validate roles server-side in API routes

## Performance

### Caching Strategy
- Token validation is done once per request
- Route matching uses efficient RegEx
- Early returns for public routes minimize processing

### Optimization Tips
1. Keep PUBLIC_ROUTES array small and specific
2. Use RegEx patterns efficiently
3. Order route configs by frequency of access

## Monitoring & Logging

### Development Mode
Check headers in browser DevTools:
```
X-User-Role: ADMIN
X-User-Id: 123
```

### Production Mode
Consider adding:
- Failed authentication logging
- Unauthorized access attempts tracking
- Rate limiting for login attempts

## Troubleshooting

### Issue: Infinite redirect loops
**Cause**: Login page is protected
**Solution**: Ensure login pages are in PUBLIC_ROUTES

### Issue: Static assets not loading
**Cause**: Middleware running on static files
**Solution**: Check matcher configuration excludes static files

### Issue: User stuck on unauthorized page
**Cause**: No proper redirect configured
**Solution**: Add appropriate redirectTo in route config

## Migration Guide

### From Old Middleware
If migrating from simpler middleware:

1. **Update route protection logic**
   ```typescript
   // Old
   if (pathname.startsWith('/admin/')) { ... }
   
   // New
   {
     pattern: /^\/admin/,
     allowedRoles: [UserRole.ADMIN],
     requireAuth: true
   }
   ```

2. **Update redirect logic**
   ```typescript
   // Old
   return NextResponse.redirect(new URL('/unauthorized', request.url))
   
   // New
   // Automatic smart redirects based on role
   ```

3. **Add security headers**
   - Automatically added in new middleware

## Version History

### v2.0 - Enhanced Security (Current)
- Added role-based access control
- Implemented security headers
- Smart redirects based on user role
- TypeScript enums for type safety
- Comprehensive route protection
- Development debug headers

### v1.0 - Basic Protection
- Simple route checking
- Basic authentication
- Limited role validation

## Contributing

When adding new routes:
1. Determine required roles
2. Add to appropriate PROTECTED_ROUTES
3. Test with all user roles
4. Update documentation
5. Consider redirect behavior

## Support

For issues or questions:
- Check this documentation first
- Review route protection matrix
- Test in development mode with debug headers
- Verify NEXTAUTH_SECRET is set correctly
