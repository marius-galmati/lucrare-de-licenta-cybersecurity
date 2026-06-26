import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/history'];
const PROTECTED_PREFIXES = ['/assessment/'];
const ADMIN_PATHS_PREFIX = '/admin';
const AUTH_PATH = '/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;
  const isAdmin = request.cookies.get('is_admin')?.value === 'true';

  const isProtected =
    PROTECTED_PATHS.includes(pathname) ||
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p) && pathname.includes('/results')) ||
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p) && pathname.includes('/answers'));

  const isAdminRoute = pathname.startsWith(ADMIN_PATHS_PREFIX);

  // Redirecționează utilizatorii neautentificați în afara rutelor protejate
  if ((isProtected || isAdminRoute) && !authToken) {
    const url = request.nextUrl.clone();
    url.pathname = AUTH_PATH;
    return NextResponse.redirect(url);
  }

  // Redirecționează utilizatorii fără rol de admin în afara rutelor de administrare
  if (isAdminRoute && authToken && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Redirecționează utilizatorii autentificați în afara paginii /auth
  if (pathname === AUTH_PATH && authToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/history',
    '/assessment/:path*/results',
    '/assessment/:path*/answers',
    '/admin/:path*',
    '/auth',
  ],
};
