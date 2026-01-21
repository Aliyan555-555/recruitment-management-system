import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

// Define user roles
enum UserRole {
  ADMIN = "ADMIN",
  INTERVIEWER = "INTERVIEWER",
  CANDIDATE = "CANDIDATE"
}

// Route configuration with roles and patterns
interface RouteConfig {
  pattern: RegExp
  allowedRoles: UserRole[]
  requireAuth: boolean
  redirectTo?: string
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/signup', 
  '/auth/error',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/unauthorized',
  '/',
  '/about',
  '/contact',
  '/jobs', // Public job listings
]

// Protected route configurations
const PROTECTED_ROUTES: RouteConfig[] = [
  // Admin Dashboard
  {
    pattern: /^\/admin\/dashboard/,
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/admin/login'
  },
  // Admin Jobs Management
  {
    pattern: /^\/admin\/jobs/,
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/admin/login'
  },
  // Admin Candidates Management
  {
    pattern: /^\/admin\/candidates/,
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/admin/login'
  },
  // Admin Users Management
  {
    pattern: /^\/admin\/users/,
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/admin/login'
  },
  // Admin Applications Management
  {
    pattern: /^\/admin\/applications/,
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/admin/login'
  },
  // Admin Interviewers Management
  {
    pattern: /^\/admin\/interviewers/,
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/admin/login'
  },
  // Admin Workflows Management
  {
    pattern: /^\/admin\/workflows/,
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/admin/login'
  },
  // Admin Settings
  {
    pattern: /^\/admin\/settings/,
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/admin/login'
  },
  // Admin Login Page (public for admins)
  {
    pattern: /^\/admin\/login/,
    allowedRoles: [UserRole.ADMIN, UserRole.INTERVIEWER, UserRole.CANDIDATE],
    requireAuth: false
  },
  // Any other admin routes
  {
    pattern: /^\/admin/,
    allowedRoles: [UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/admin/login'
  },
  
  // Interviewer Dashboard
  {
    pattern: /^\/interviewer\/dashboard/,
    allowedRoles: [UserRole.ADMIN, UserRole.INTERVIEWER],
    requireAuth: true,
    redirectTo: '/interviewer/login'
  },
  // Interviewer Assignments
  {
    pattern: /^\/interviewer\/assignments/,
    allowedRoles: [UserRole.ADMIN, UserRole.INTERVIEWER],
    requireAuth: true,
    redirectTo: '/interviewer/login'
  },
  // Interviewer Batches
  {
    pattern: /^\/interviewer\/batches/,
    allowedRoles: [UserRole.ADMIN, UserRole.INTERVIEWER],
    requireAuth: true,
    redirectTo: '/interviewer/login'
  },
  // Interviewer Calendar
  {
    pattern: /^\/interviewer\/calendar/,
    allowedRoles: [UserRole.ADMIN, UserRole.INTERVIEWER],
    requireAuth: true,
    redirectTo: '/interviewer/login'
  },
  // Interviewer Login Page (public for interviewers)
  {
    pattern: /^\/interviewer\/login/,
    allowedRoles: [UserRole.ADMIN, UserRole.INTERVIEWER, UserRole.CANDIDATE],
    requireAuth: false
  },
  // Any other interviewer routes
  {
    pattern: /^\/interviewer/,
    allowedRoles: [UserRole.ADMIN, UserRole.INTERVIEWER],
    requireAuth: true,
    redirectTo: '/interviewer/login'
  },
  
  // Candidate Profile
  {
    pattern: /^\/candidate\/profile/,
    allowedRoles: [UserRole.CANDIDATE, UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/login'
  },
  // Candidate routes
  {
    pattern: /^\/candidate/,
    allowedRoles: [UserRole.CANDIDATE, UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/login'
  },
  
  // Profile routes (legacy, should use /candidate/profile)
  {
    pattern: /^\/profile/,
    allowedRoles: [UserRole.CANDIDATE, UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/login'
  },
  
  // Applications
  {
    pattern: /^\/applications/,
    allowedRoles: [UserRole.CANDIDATE, UserRole.ADMIN],
    requireAuth: true,
    redirectTo: '/login'
  }
]

/**
 * Check if a pathname is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1))
    }
    return pathname === route || pathname.startsWith(`${route}/`)
  })
}

/**
 * Find matching route configuration for a pathname
 */
function findMatchingRoute(pathname: string): RouteConfig | null {
  for (const route of PROTECTED_ROUTES) {
    if (route.pattern.test(pathname)) {
      return route
    }
  }
  return null
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: string | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole as UserRole)
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Get authentication token with error handling
  let token = null
  try {
    token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
  } catch (error) {
    // Log error in development, fail silently in production to avoid exposing errors
    if (process.env.NODE_ENV === 'development') {
      console.error('Middleware token error:', error)
    }
    // Continue without token - will be treated as unauthenticated
  }

  // Find matching route configuration
  const routeConfig = findMatchingRoute(pathname)

  // If no specific route config and not public, require authentication
  if (!routeConfig) {
    if (!token) {
      const signInUrl = new URL('/login', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
    return NextResponse.next()
  }

  // If route doesn't require auth, allow access (but still check role if token exists)
  if (!routeConfig.requireAuth) {
    // If user is authenticated and has a token, check if they should be redirected
    // (e.g., admin already logged in trying to access login page)
    if (token && routeConfig.allowedRoles.length > 0) {
      const userRole = token.role as string
      // If user has valid role for this route, allow access
      if (hasRequiredRole(userRole, routeConfig.allowedRoles)) {
        return NextResponse.next()
      }
    }
    // Allow access to login pages even without token
    return NextResponse.next()
  }

  // Check authentication requirement for protected routes
  if (routeConfig.requireAuth && !token) {
    const redirectPath = routeConfig.redirectTo || '/login'
    const signInUrl = new URL(redirectPath, request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Check role-based access for authenticated users
  if (token && routeConfig.allowedRoles.length > 0) {
    const userRole = token.role as string | undefined
    
    // If token exists but has no role, treat as invalid token and redirect to login
    if (!userRole) {
      const redirectPath = routeConfig.redirectTo || '/login'
      const signInUrl = new URL(redirectPath, request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }
    
    if (!hasRequiredRole(userRole, routeConfig.allowedRoles)) {
      // Redirect based on user's role to their appropriate dashboard
      let redirectUrl = '/unauthorized'
      
      if (userRole === UserRole.ADMIN) {
        redirectUrl = '/admin/dashboard'
      } else if (userRole === UserRole.INTERVIEWER) {
        redirectUrl = '/interviewer/dashboard'
      } else if (userRole === UserRole.CANDIDATE) {
        redirectUrl = '/candidate/profile'
      }
      
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
  }

  // Add security headers
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Add user info to headers for debugging (only in development)
  if (process.env.NODE_ENV === 'development' && token) {
    response.headers.set('X-User-Role', token.role as string || 'unknown')
    response.headers.set('X-User-Id', token.id as string || 'unknown')
  }

  return response
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     * - files with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
