import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Bypass middleware for static files and images immediately
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('/static') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  // Define protected routes
  const protectedRoutes = [
    '/dashboard',
    '/settings',
    '/project',
    '/notifications',
    '/approve'
  ]

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Define public routes that don't require auth
  // Note: /join is public to allow non-members to view the join page (which handles its own redirect if needed)
  const publicRoutes = [
    '/',
    '/login',
    '/forgot-password',
    '/join',
    '/privacy',
    '/terms',
    '/auth',
    '/docs',
    '/robots.txt',
    '/sitemap.xml'
  ]

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Define public API routes
  const publicApiRoutes = [
    '/api/cli-version',
    '/api/cli',
    '/api/search'
  ]

  const isPublicApi = publicApiRoutes.some(route => pathname.startsWith(route))

  // If it's a protected route and user is not authenticated, redirect to login
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // If user is authenticated and trying to access login page, redirect to dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // For API routes, protect all except public ones
  if (pathname.startsWith('/api') && !isPublicApi && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}