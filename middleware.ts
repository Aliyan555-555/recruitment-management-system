import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get the token to check user's role
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Public routes that don't need authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/error', '/', '/about', '/contact']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // No token = not authenticated
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  const userRole = token.role as string

  // Admin-only routes
  const adminRoutes = [
    '/admin/jobs',
    '/admin/candidates',
    '/admin/interviews',
    '/admin/batches',
    '/admin/slots'
  ]
  
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Round management pages - Admin only
  if (pathname.match(/\/admin\/jobs\/\d+\/rounds/)) {
    if (userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Interviewer routes - Admin or Interviewer
  if (pathname.startsWith('/interviewer/')) {
    if (userRole !== 'ADMIN' && userRole !== 'INTERVIEWER') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Assessment forms - Admin or assigned Interviewer
  // Note: Detailed assignment checking happens in the API/page component
  if (pathname.match(/\/admin\/jobs\/\d+\/rounds\/\d+\/candidates\/\d+\/assessment/)) {
    if (userRole !== 'ADMIN' && userRole !== 'INTERVIEWER') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Candidate routes - All authenticated users can access their own profile
  if (pathname.startsWith('/profile/')) {
    // Allow all authenticated users
    return NextResponse.next()
  }

  return NextResponse.next()
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
