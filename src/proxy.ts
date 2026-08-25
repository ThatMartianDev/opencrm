import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/invitation",
  "/api/auth",
];
const INTERNAL_TOOL_PATHS = ["/api/internal/ai/tools/search-records", "/api/internal/ai/tools/get-linked-records"];

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

  // Skip auth check for public routes
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    INTERNAL_TOOL_PATHS.includes(pathname)
  ) {
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
  matcher: ["/app/:organizationId", "/app/:organizationId/:path*", "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};