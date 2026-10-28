import { prisma } from "@/lib/db/client";
import { ActivityType } from "@/generated/prisma/enums";
import { ActivityLogService } from "@/modules/activity-log/service";
import { z } from "zod";

const editableFieldSchema = z.enum(["name", "email", "phone", "website", "industry", "size", "address"]);

export const CompaniesService = {
    async getAllCompanies(organizationId: string) {
        return prisma.company.findMany({
            where: { organizationId, deletedAt: null },
            include: {
                _count: { select: { contacts: true, deals: true } },
            },
            orderBy: { name: "asc" },
        });
    },

    async getCompanyById(companyId: string, organizationId: string) {
        return prisma.company.findFirst({
            where: { id: companyId, organizationId, deletedAt: null },
            include: {
                contacts: { where: { deletedAt: null } },
                deals: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
            },
        });
    },

    async createCompany(
        data: {
            name: string;
            email?: string;
            phone?: string;
            website?: string;
            industry?: string;
            size?: string;
            address?: string;
            organizationId: string;
        },
        memberId?: string,
    ) {
        const company = await prisma.company.create({
            data: { ...data, createdById: memberId },
        });

        if (memberId) {
            await ActivityLogService.log({
                organizationId: data.organizationId,
                memberId,
                entity: { entityType: "company", entityId: company.id },
                activityType: ActivityType.CREATION,
                title: "Company created",
            });
        }

        return company;
    },

    async updateCompanyField(
        companyId: string,
        field: "name" | "email" | "phone" | "website" | "industry" | "size" | "address",
        value: string,
        organizationId: string,
        memberId: string,
    ) {
        field = editableFieldSchema.parse(field);
        value = z.string().parse(value);
        const company = await prisma.company.findFirst({ where: { id: companyId, organizationId, deletedAt: null } });
        if (!company) throw new Error("Company not found");
        const oldValue = company[field];

        const updated = await prisma.company.update({
            where: { id: companyId, organizationId, deletedAt: null },
            data: { [field]: value || null },
        });

        await ActivityLogService.log({
            organizationId,
            memberId,
            entity: { entityType: "company", entityId: companyId },
            activityType: ActivityType.STATUS_CHANGE,
            title: `Updated ${field}`,
            metadata: { field, from: oldValue, to: value },
        });

        return updated;
    },

    async deleteCompany(data: {
        companyId: string;
        organizationId: string;
        memberId: string;
        canDeleteAny: boolean;
    }) {
        const result = await prisma.company.updateMany({
            where: {
                id: data.companyId,
                organizationId: data.organizationId,
                deletedAt: null,
                ...(data.canDeleteAny ? {} : { createdById: data.memberId }),
            },
            data: { deletedAt: new Date() },
        });

        if (result.count === 0) {
            const exists = await prisma.company.findFirst({
                where: { id: data.companyId, organizationId: data.organizationId, deletedAt: null },
                select: { id: true },
            });
            if (exists) throw new Error("You can only delete companies you created.");
            throw new Error("Company not found.");
        }

        await ActivityLogService.log({
            organizationId: data.organizationId,
            memberId: data.memberId,
            entity: { entityType: "company", entityId: data.companyId },
            activityType: ActivityType.STATUS_CHANGE,
            title: "Company deleted",
        });
    },
};
