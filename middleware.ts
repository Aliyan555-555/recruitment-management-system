import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  // Use getToken instead of auth() to avoid Prisma initialization in Edge runtime
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  if (
    pathname === '/' ||                          // Landing page
    pathname.startsWith('/login') ||
    pathname === '/admin/login' ||               // Admin login page
    pathname === '/interviewer/login' ||         // Interviewer login page
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/register') ||
    pathname.startsWith('/api/jobs/public') ||   // Public jobs API
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/jobs/') && pathname.includes('/apply/success') // Success pages
  ) {
    return NextResponse.next()
  }

  // Protected routes - require authentication
  if (!token || !token.role) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const userRole = token.role as string

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'ADMIN') {
      const homeUrl = new URL('/', request.url)
      return NextResponse.redirect(homeUrl)
    }
  }

  // Interviewer routes
  if (pathname.startsWith('/interviewer')) {
    if (userRole !== 'INTERVIEWER' && userRole !== 'ADMIN') {
      const homeUrl = new URL('/', request.url)
      return NextResponse.redirect(homeUrl)
    }
  }

  // Candidate routes (applications, profile management)
  if (pathname.startsWith('/applications') || pathname.startsWith('/profile')) {
    if (userRole !== 'CANDIDATE' && userRole !== 'ADMIN') {
      const homeUrl = new URL('/', request.url)
      return NextResponse.redirect(homeUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/auth|api/register|_next/static|_next/image|favicon.ico).*)',
  ],
}
