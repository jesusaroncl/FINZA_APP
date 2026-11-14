

import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (error) {
    console.error('[proxy] Error:', error)
    const isProtectedRoute = ['/dashboard', '/movimientos', '/proyecciones', '/settings', '/help']
      .some((route) => request.nextUrl.pathname.startsWith(route))
    if (isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
