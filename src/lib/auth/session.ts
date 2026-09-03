import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { SessionClaims, SessionPayload } from "./types";
import { getJwtSecret, toSessionClaims } from "./token";
import { prisma } from "../db/client";

const WORKSPACE_SELECTION_COOKIE = "workspace_selection";
const WORKSPACE_CREATION_COOKIE = "workspace_creation";
 
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
  } catch {
    console.log('Failed to verify session')
  }
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

export async function createWorkspaceSelectionSession(userId: string) {
  const token = await new SignJWT({
    userId,
    purpose: "workspace-selection",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getJwtSecret());

  (await cookies()).set(WORKSPACE_SELECTION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
}

export async function getWorkspaceSelectionUserId(): Promise<string> {
  const token = (await cookies()).get(WORKSPACE_SELECTION_COOKIE)?.value;
  if (!token) throw new Error("Workspace selection expired");

  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });

  if (
    payload.purpose !== "workspace-selection" ||
    typeof payload.userId !== "string"
  ) {
    throw new Error("Invalid workspace selection");
  }

  return payload.userId;
}

export async function clearWorkspaceSelectionSession() {
  (await cookies()).delete(WORKSPACE_SELECTION_COOKIE);
}

export async function createWorkspaceCreationSession(userId: string) {
  const token = await new SignJWT({
    userId,
    purpose: "workspace-creation",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(getJwtSecret());

  (await cookies()).set(WORKSPACE_CREATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 30,
    path: "/",
  });
}

export async function getWorkspaceCreationUserId(): Promise<string> {
  const token = (await cookies()).get(WORKSPACE_CREATION_COOKIE)?.value;
  if (!token) throw new Error("Workspace creation session expired");

  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });

  if (
    payload.purpose !== "workspace-creation" ||
    typeof payload.userId !== "string"
  ) {
    throw new Error("Invalid workspace creation session");
  }

  return payload.userId;
}

export async function clearWorkspaceCreationSession() {
  (await cookies()).delete(WORKSPACE_CREATION_COOKIE);
}

export const getSessionClaims = cache(async (): Promise<SessionClaims> => {
  const secret = getJwtSecret();
  const token = (await cookies()).get("session")?.value;
  if (!token) throw new Error("Not authenticated");

  const { payload } = await jwtVerify(token, secret);
  const tokenClaims = toSessionClaims(payload);

  const member = await prisma.member.findFirst({
    where: {
      id: tokenClaims.memberId,
      userId: tokenClaims.userId,
      organizationId: tokenClaims.organizationId,
    },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      role: true,
      permissions: true,
    },
  });

  if (!member) {
    throw new Error("Not authenticated");
  }

  return {
    userId: member.userId,
    memberId: member.id,
    organizationId: member.organizationId,
    role: member.role,
    permissions: member.permissions,
  };
});

export async function getCurrentUser(): Promise<SessionClaims> {
  return getSessionClaims();
}