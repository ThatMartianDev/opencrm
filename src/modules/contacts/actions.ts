"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { ContactsService } from "./service";
import { z } from "zod";

const createContactSchema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(50).optional().or(z.literal("")),
    jobTitle: z.string().max(200).optional().or(z.literal("")),
    source: z.string().max(100).optional().or(z.literal("")),
    companyId: z.string().optional().or(z.literal("")),
});

export const getContacts = async () => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("contacts.read");
    return ContactsService.getAllContacts(session.organizationId);
};

export const getContactById = async (contactId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("contacts.read");
    return ContactsService.getContactById(contactId, session.organizationId);
};

export const createContact = async (data: {
    name: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    source?: string;
    companyId?: string;
}) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("contacts.create");

    const validated = createContactSchema.parse(data);
    return ContactsService.createContact(
        { ...validated, organizationId: session.organizationId },
        session.memberId,
    );
};

export const updateContactField = async (
    contactId: string,
    field: "name" | "email" | "phone" | "jobTitle" | "source",
    value: string,
) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("contacts.update");
    return ContactsService.updateContactField(contactId, field, value, session.organizationId, session.memberId);
};

export const deleteContact = async (contactId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);

    const canDeleteAny = ctx.can("contacts.delete.any");
    if (!canDeleteAny) ctx.assertCan("contacts.delete.own");

    return ContactsService.deleteContact({
        contactId,
        organizationId: session.organizationId,
        memberId: session.memberId,
        canDeleteAny,
    });
};
