import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function redirectWithCookies(url: URL, from: NextResponse) {
  const res = NextResponse.redirect(url)
  from.cookies.getAll().forEach((c) => res.cookies.set(c))
  return res
}

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/movimientos') ||
    request.nextUrl.pathname.startsWith('/proyecciones') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/help')

  // Redirigir al usuario no logueado a la página de login si intenta acceder a rutas protegidas
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return redirectWithCookies(url, supabaseResponse)
  }

  // Redirigir al usuario logueado al dashboard si intenta acceder a login o register
  if (user && isAuthRoute && (request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/auth/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return redirectWithCookies(url, supabaseResponse)
  }

  if (isProtectedRoute) {
    supabaseResponse.headers.set('Cache-Control', 'private, no-store, max-age=0')
  }
  return supabaseResponse
}
