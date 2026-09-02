import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function redirectToLogin(request: NextRequest) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function getJwtSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== "/app" && !pathname.startsWith("/app/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;

  if (!token) return redirectToLogin(request);

  // Validate JWT signature and expiration
  const secret = getJwtSecret();
  if (!secret) return redirectToLogin(request);

  try {
    await jwtVerify(token, secret, { algorithms: ["HS256"] });
  } catch {
    // Token invalid or expired — clear it and redirect
    const response = redirectToLogin(request);
    response.cookies.delete("session");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

export const config = {
  matcher: ["/app/:path*"],
};