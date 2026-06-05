import { LoginInput, RegisterInput } from "./types";
import { hash, verify } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/utils";
import { MemberRole } from "@/generated/prisma/enums";

// src/modules/auth/service.ts
export const AuthService = {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw new AppError("An account with this email already exists", "EMAIL_TAKEN", 409);
    }

    const orgSlug = slugify(input.organizationName);
    const hashedPassword = await hash(input.password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, name: input.name, passwordHash: hashedPassword },
      });

      const org = await tx.organization.create({
        data: { name: input.organizationName, slug: orgSlug },
      });

      const member = await tx.member.create({
        data: { userId: user.id, organizationId: org.id, role: "OWNER" },
      });

      return { user, org, member };
    });
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash || !(await verify(input.password, user.passwordHash))) {
      throw new AppError("Invalid email or password", "INVALID_CREDENTIALS", 401);
    }

    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    return { user, member };
  },

  async registerWithInvite(input: {
    name: string;
    email: string;
    password: string;
    organizationId: string;
    role: MemberRole;
  }) {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw new AppError("An account with this email already exists", "EMAIL_TAKEN", 409);
    }

    const hashedPassword = await hash(input.password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: input.email, name: input.name, passwordHash: hashedPassword },
      });

      const member = await tx.member.create({
        data: {
          userId: user.id,
          organizationId: input.organizationId,
          role: input.role,
        },
      });

      return { user, member };
    });
  },
};