import { prisma } from "@/lib/db/client";
import { ActivityType } from "@/generated/prisma/enums";
import { ActivityLogService } from "@/modules/activity-log/service";

export const ContactsService = {
    async getAllContacts(organizationId: string) {
        return prisma.contact.findMany({
            where: { organizationId, deletedAt: null },
            include: {
                company: { select: { id: true, name: true } },
            },
            orderBy: { name: "asc" },
        });
    },

    async getContactById(contactId: string, organizationId: string) {
        return prisma.contact.findFirst({
            where: { id: contactId, organizationId, deletedAt: null },
            include: {
                company: true,
                deals: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
            },
        });
    },

    async createContact(
        data: {
            name: string;
            email?: string;
            phone?: string;
            jobTitle?: string;
            source?: string;
            companyId?: string;
            organizationId: string;
        },
        memberId?: string,
    ) {
        const contact = await prisma.contact.create({
            data: { ...data, createdById: memberId },
        });

        if (memberId) {
            await ActivityLogService.log({
                organizationId: data.organizationId,
                memberId,
                entity: { entityType: "contact", entityId: contact.id },
                activityType: ActivityType.CREATION,
                title: "Contact created",
            });
        }

        return contact;
    },

    async updateContactField(
        contactId: string,
        field: "name" | "email" | "phone" | "jobTitle" | "source",
        value: string,
        organizationId: string,
        memberId: string,
    ) {
        const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId, deletedAt: null } });
        if (!contact) throw new Error("Contact not found");
        const oldValue = contact[field];

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: { [field]: value || null },
        });

        await ActivityLogService.log({
            organizationId,
            memberId,
            entity: { entityType: "contact", entityId: contactId },
            activityType: ActivityType.STATUS_CHANGE,
            title: `Updated ${field}`,
            metadata: { field, from: oldValue, to: value },
        });

        return updated;
    },

    async deleteContact(data: {
        contactId: string;
        organizationId: string;
        memberId: string;
        canDeleteAny: boolean;
    }) {
        const result = await prisma.contact.updateMany({
            where: {
                id: data.contactId,
                organizationId: data.organizationId,
                deletedAt: null,
                ...(data.canDeleteAny ? {} : { createdById: data.memberId }),
            },
            data: { deletedAt: new Date() },
        });

        if (result.count === 0) {
            const exists = await prisma.contact.findFirst({
                where: { id: data.contactId, organizationId: data.organizationId, deletedAt: null },
                select: { id: true },
            });
            if (exists) throw new Error("You can only delete contacts you created.");
            throw new Error("Contact not found.");
        }

        await ActivityLogService.log({
            organizationId: data.organizationId,
            memberId: data.memberId,
            entity: { entityType: "contact", entityId: data.contactId },
            activityType: ActivityType.STATUS_CHANGE,
            title: "Contact deleted",
        });
    },
};
