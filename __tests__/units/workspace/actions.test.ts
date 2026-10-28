import { createSession, getSessionClaims } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { inviteMember, switchWorkspace, updateMemberRole } from "@/modules/workspace/actions";
import type { MemberRole } from "@/generated/prisma/enums";

jest.mock("@/lib/auth/session", () => ({
  createSession: jest.fn(),
  getSessionClaims: jest.fn(),
}));
jest.mock("@/lib/db/client", () => ({
  prisma: {
    member: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    invitation: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
    organization: { findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(async () => {}),
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
    describe("workspace role assignment", () => {
      beforeEach(() => {
        jest.clearAllMocks();
        mockGetSessionClaims.mockResolvedValue({
          userId: "user_1",
          memberId: "member_1",
          organizationId: "org_1",
          role: "OWNER",
        });
        jest.mocked(prisma.user.findUnique).mockResolvedValue(null);
        jest.mocked(prisma.invitation.findUnique).mockResolvedValue(null);
        jest.mocked(prisma.organization.findUnique).mockResolvedValue(null);
      });

      test.each(["OWNER", "INVALID", { set: "OWNER" }, null])(
        "rejects invalid invitation role %p before database access",
        async (role) => {
          await expect(
            Reflect.apply(inviteMember, undefined, [{ email: "invitee@example.com", role }]),
          ).rejects.toThrow();
          expect(prisma.user.findUnique).not.toHaveBeenCalled();
          expect(prisma.invitation.create).not.toHaveBeenCalled();
        },
      );

      test.each<MemberRole>(["OWNER", "ADMIN", "MANAGER"])(
        "allows %s to invite a member",
        async (role) => {
          mockGetSessionClaims.mockResolvedValue({
            userId: "user_1", memberId: "member_1", organizationId: "org_1", role,
          });
          await expect(inviteMember({ email: "invitee@example.com", role: "MEMBER" }))
            .resolves.toEqual({ email: "invitee@example.com", role: "MEMBER" });
          expect(prisma.invitation.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ organizationId: "org_1", role: "MEMBER" }),
          });
        },
      );

      test.each<MemberRole>(["ADMIN", "MANAGER"])(
        "prevents a manager inviting %s",
        async (role) => {
          mockGetSessionClaims.mockResolvedValue({
            userId: "user_1", memberId: "member_1", organizationId: "org_1", role: "MANAGER",
          });
          await expect(inviteMember({ email: "invitee@example.com", role }))
            .rejects.toThrow("Managers can only invite members");
          expect(prisma.invitation.create).not.toHaveBeenCalled();
        },
      );

      test.each<MemberRole>(["OWNER", "ADMIN"])(
        "preserves %s invitations for admin and manager roles",
        async (role) => {
          mockGetSessionClaims.mockResolvedValue({
            userId: "user_1", memberId: "member_1", organizationId: "org_1", role,
          });
          for (const invitedRole of ["ADMIN", "MANAGER"] as const) {
            await expect(inviteMember({ email: "invitee@example.com", role: invitedRole }))
              .resolves.toEqual({ email: "invitee@example.com", role: invitedRole });
          }
        },
      );

      test("prevents ordinary members from inviting", async () => {
        mockGetSessionClaims.mockResolvedValue({
          userId: "user_1", memberId: "member_1", organizationId: "org_1", role: "MEMBER",
        });
        await expect(inviteMember({ email: "invitee@example.com", role: "MEMBER" }))
          .rejects.toThrow("You don't have permission");
        expect(prisma.invitation.create).not.toHaveBeenCalled();
      });

      test.each(["OWNER", "INVALID", { set: "ADMIN" }])(
        "rejects invalid role changes %p before database access",
        async (role) => {
          await expect(Reflect.apply(updateMemberRole, undefined, ["member_2", role]))
            .rejects.toThrow();
          expect(prisma.member.findFirst).not.toHaveBeenCalled();
        },
      );
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