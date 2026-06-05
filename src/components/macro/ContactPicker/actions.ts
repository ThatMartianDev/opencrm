"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function fetchOrganizationContacts(search?: string) {
    const session = await getSessionClaims();
    const contacts = await prisma.contact.findMany({
        where: {
            organizationId: session.organizationId,
            deletedAt: null,
            ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        },
        select: {
            id: true,
            name: true,
            email: true,
            company: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        take: 50,
    });
    return contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        companyId: contact.company?.id ?? null,
        companyName: contact.company?.name ?? null,
    }));
}
