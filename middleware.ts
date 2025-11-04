import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await auth()
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/register')
  ) {
    return NextResponse.next()
  }

  // Protected routes - require authentication
  if (!session || !session.user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const userRole = session.user.role

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
