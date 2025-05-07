import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const path = request.nextUrl.pathname;
  
  // Check if the path is for dashboard routes that need protection
  const isProtectedRoute = path.startsWith('/dashboard');
  const isAuthRoute = path.startsWith('/auth');
  
  // For authentication, check these possible sources:
  
  // 1. Look for session-specific tokens (format: token_session_*)
  const hasPrefixedToken = Array.from(request.cookies.getAll()).some(cookie => 
    cookie.name.startsWith('token_session_') && cookie.value
  );
  
  // 2. Check for the legacy token
  const legacyToken = request.cookies.get('token')?.value;
  
  // Consider authenticated if any token method is present
  const isAuthenticated = hasPrefixedToken || !!legacyToken;
  
  // For protected routes: redirect to login if not authenticated
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // For auth routes: redirect to dashboard if already authenticated
  // But: allow accessing login/register even when authenticated in other tabs
  // This allows multiple users to log in from different tabs
  if (isAuthRoute && path !== '/auth/login' && path !== '/auth/register' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}; 