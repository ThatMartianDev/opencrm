"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function fetchOrganizationCompanies(search?: string) {
    const session = await getSessionClaims();
    const companies = await prisma.company.findMany({
        where: {
            organizationId: session.organizationId,
            deletedAt: null,
            ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        },
        select: {
            id: true,
            name: true,
            industry: true,
        },
        orderBy: { name: "asc" },
        take: 50,
    });
    return companies.map((company) => ({
        id: company.id,
        name: company.name,
        industry: company.industry,
    }));
}
