import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

// Optimistic check only: sends visitors without a session cookie to /login.
// The real session + permission checks happen in requireViewer()/requirePermission().
// "/m" = public member card page (QR link on the ID).
const PUBLIC_PATHS = ["/login", "/register", "/pending", "/m", "/privacy"]

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next()

  if (!getSessionCookie(request)) {
    const url = new URL("/login", request.url)
    if (pathname !== "/" && pathname !== "/dashboard") url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // Skip API routes, Next internals and static files.
  matcher: [
    "/((?!api|_next/static|_next/image|brand|mediapipe|zxing|manifest.webmanifest|icon.png|apple-icon.png|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)",
  ],
}
