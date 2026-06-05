import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { SessionClaims, SessionPayload } from "./types";
 
async function encrypt(payload: SessionPayload, encodedKey: Uint8Array) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}
 
async function decrypt(session: string | undefined = '', encodedKey: Uint8Array) {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    console.log('Failed to verify session')
  }
}

function getJwtSecret() {
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) {
    throw new Error("AUTH_SECRET is missing. Add AUTH_SECRET to your .env.local file.");
  }
  return new TextEncoder().encode(authSecret);
}

export async function createSession(payload: SessionPayload) {
  const secret = getJwtSecret();
  const token = await encrypt(payload, secret);

  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function refreshSession() {
  const session = (await cookies()).get('session')?.value
  const secret = getJwtSecret();
  const payload = await decrypt(session, secret);
 
  if (!session || !payload) {
    return null
  }
 
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
 
  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expires,
    sameSite: 'lax',
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

function toSessionClaims(payload: unknown): SessionClaims {
  const claims = payload as Partial<SessionClaims>;

  if (
    typeof claims?.userId !== "string" ||
    typeof claims?.memberId !== "string" ||
    typeof claims?.organizationId !== "string" ||
    typeof claims?.role !== "string"
  ) {
    throw new Error("Invalid session payload");
  }

  return {
    userId: claims.userId,
    memberId: claims.memberId,
    organizationId: claims.organizationId,
    role: claims.role,
  };
}

export const getSessionClaims = cache(async (): Promise<SessionClaims> => {
  const secret = getJwtSecret();
  const token = (await cookies()).get("session")?.value;
  if (!token) throw new Error("Not authenticated");

  const { payload } = await jwtVerify(token, secret);
  return toSessionClaims(payload);
});

export async function getCurrentUser(): Promise<SessionClaims> {
  return getSessionClaims();
}