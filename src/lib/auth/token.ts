import { jwtVerify } from "jose";
import { SessionClaims } from "./types";

export function getJwtSecret() {
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) {
    throw new Error(
      "AUTH_SECRET is missing. Add AUTH_SECRET to your .env.local file.",
    );
  }
  return new TextEncoder().encode(authSecret);
}

export function toSessionClaims(payload: unknown): SessionClaims {
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

/**
  Verifies a raw session JWT (e.g. parsed from a cookie header outside of a
  Next.js request context, such as the socket.io handshake). Returns null when
  the token is missing, invalid, or expired.
 */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionClaims | null> {
  if (!token) return null;

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return toSessionClaims(payload);
  } catch {
    return null;
  }
}
