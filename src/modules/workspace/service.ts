import { prisma } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { MemberDataSize, WorkspaceBootstrap } from "./types";

export const WorkspaceService = {
  async getWorkspaceBootstrap(
    organizationId: string,
    userId: string,
  ): Promise<WorkspaceBootstrap> {
    const member = await prisma.member.findFirst({
      where: {
        organizationId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!member) {
      throw new AppError("Workspace access denied", "FORBIDDEN", 403);
    }

    return {
      organizationId: member.organization.id,
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name || "",
        avatarUrl: member.user.avatarUrl,
      },
      member: {
        id: member.id,
        role: member.role,
        permissions: member.permissions,
      },
      organization: {
        id: member.organization.id,
        name: member.organization.name,
        slug: member.organization.slug,
        plan: member.organization.plan,
        logoUrl: member.organization.logoUrl,
      },
    };
  },

  async getMemberData(
    memberId: string,
    userId: string,
    dataSize?: MemberDataSize,
  ) {
    let member;
    if (dataSize === "minimal") {
      member = await prisma.member.findFirst({
        where: {
          id: memberId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });
    } else if (dataSize === "partial") {
      member = await prisma.member.findFirst({
        where: {
          id: memberId,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
            },
          },
        },
      });
    } else if (dataSize === "full") {
      member = await prisma.member.findFirst({
        where: {
          id: memberId,
          userId,
        },
        include: {
          user: true,
          organization: true,
        },
      });
    }

    return member;
  },

  getAllMembers(organizationId: string) {
      return prisma.member.findMany({
          where: { organizationId },
          select: {
              id: true,
              userId: true,
              role: true,
              user: {
                  select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                      email: true,
                  },
              },
          },
          orderBy: { joinedAt: "asc" },
      });
  }
};
