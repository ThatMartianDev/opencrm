"use server";

import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { CompaniesService } from "./service";
import { z } from "zod";

const createCompanySchema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(50).optional().or(z.literal("")),
    website: z.string().max(500).optional().or(z.literal("")),
    industry: z.string().max(100).optional().or(z.literal("")),
    size: z.string().max(20).optional().or(z.literal("")),
    address: z.string().max(500).optional().or(z.literal("")),
});

export const getCompanies = async () => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("companies.read");
    return CompaniesService.getAllCompanies(session.organizationId);
};

export const getCompanyById = async (companyId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("companies.read");
    return CompaniesService.getCompanyById(companyId, session.organizationId);
};

export const createCompany = async (data: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    industry?: string;
    size?: string;
    address?: string;
}) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("companies.create");

    const validated = createCompanySchema.parse(data);
    return CompaniesService.createCompany(
        { ...validated, organizationId: session.organizationId },
        session.memberId,
    );
};

export const updateCompanyField = async (
    companyId: string,
    field: "name" | "email" | "phone" | "website" | "industry" | "size" | "address",
    value: string,
) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("companies.update");
    return CompaniesService.updateCompanyField(companyId, field, value, session.organizationId, session.memberId);
};

export const deleteCompany = async (companyId: string) => {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);

    const canDeleteAny = ctx.can("companies.delete.any");
    if (!canDeleteAny) ctx.assertCan("companies.delete.own");

    return CompaniesService.deleteCompany({
        companyId,
        organizationId: session.organizationId,
        memberId: session.memberId,
        canDeleteAny,
    });
};
