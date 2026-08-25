import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/auth/token";

export type CatcherToolName = "search_records" | "get_linked_records";

export type CatcherToolGrant = {
  runId: string;
  userId: string;
  memberId: string;
  organizationId: string;
  tools: CatcherToolName[];
};

const ISSUER = "opencrm";
const AUDIENCE = "opencrm-ai-tools";

export async function createCatcherToolGrant(
  grant: CatcherToolGrant,
): Promise<string> {
  return new SignJWT(grant)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(grant.memberId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getJwtSecret());
}

export async function verifyCatcherToolGrant(
  token: string,
): Promise<CatcherToolGrant | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const tools = payload.tools;
    if (
      typeof payload.runId !== "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.memberId !== "string" ||
      typeof payload.organizationId !== "string" ||
      !Array.isArray(tools) ||
      !tools.every(
        (tool) => tool === "search_records" || tool === "get_linked_records",
      )
    ) {
      return null;
    }

    return {
      runId: payload.runId,
      userId: payload.userId,
      memberId: payload.memberId,
      organizationId: payload.organizationId,
      tools,
    };
  } catch {
    return null;
  }
}