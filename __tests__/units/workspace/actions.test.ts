import { createSession, getSessionClaims } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { switchWorkspace } from "@/modules/workspace/actions";

jest.mock("@/lib/auth/session", () => ({
  createSession: jest.fn(),
  getSessionClaims: jest.fn(),
}));
jest.mock("@/lib/db/client", () => ({
  prisma: {
    member: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(),
  templates: { invite: jest.fn() },
}));

const mockCreateSession = jest.mocked(createSession);
const mockGetSessionClaims = jest.mocked(getSessionClaims);
const mockMember = jest.mocked(prisma.member);

describe("switchWorkspace", () => {
  beforeEach(() => {
    mockGetSessionClaims.mockResolvedValue({
      userId: "user_1",
      memberId: "member_1",
      organizationId: "org_1",
      role: "OWNER",
    });
  });

  test("rotates the session with server-derived target membership claims", async () => {
    mockMember.findUnique.mockResolvedValue({
      id: "member_2",
      organizationId: "org_2",
      role: "MEMBER",
      organization: { slug: "workspace-two" },
    } as never);

    await expect(switchWorkspace("org_2")).resolves.toEqual({
      organizationId: "org_2",
      workspaceSlug: "workspace-two",
    });

    expect(mockMember.findUnique).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId: "user_1",
          organizationId: "org_2",
        },
      },
      select: {
        id: true,
        organizationId: true,
        role: true,
        organization: { select: { slug: true } },
      },
    });
    expect(mockCreateSession).toHaveBeenCalledWith({
      userId: "user_1",
      memberId: "member_2",
      organizationId: "org_2",
      role: "MEMBER",
    });
  });

  test("rejects a workspace the current user does not belong to", async () => {
    mockMember.findUnique.mockResolvedValue(null);

    await expect(switchWorkspace("org_other")).rejects.toThrow(
      "Workspace access denied",
    );
    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});