import { prisma } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { MemberDataSize, WorkspaceBootstrap } from "./types";

async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.member.findMany({
    where: { userId },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map(({ organization, role }) => ({
    ...organization,
    role,
  }));
}

export const WorkspaceService = {
  getUserWorkspaces,

  async getWorkspaceSlug(organizationId: string, userId: string) {
    const membership = await prisma.member.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { organization: { select: { slug: true } } },
    });

    if (!membership) {
      throw new AppError("Workspace access denied", "FORBIDDEN", 403);
    }

    return membership.organization.slug;
  },

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
            recordModules: {
              where: { archivedAt: null },
              select: {
                id: true,
                key: true,
                name: true,
                pluralName: true,
                icon: true,
                accentColor: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!member) {
      throw new AppError("Workspace access denied", "FORBIDDEN", 403);
    }

    const workspaces = await getUserWorkspaces(userId);

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
      workspaces,
      recordModules: member.organization.recordModules,
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
