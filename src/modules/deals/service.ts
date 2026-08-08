import { prisma } from "@/lib/db/client";
import { ActivityType, DealStage } from "@/generated/prisma/enums";
import { ActivityLogService } from "@/modules/activity-log/service";
import { NotificationsService } from "@/modules/notifications/service";
import {
  assertCrmLinksBelongToOrganization,
  assertMemberBelongsToOrganization,
} from "@/lib/dal/crm-links";

export const DealsService = {
  async getAllDeals(organizationId: string) {
    return prisma.deal.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        contact: true,
        company: true,
        assignedTo: {
          include: { user: { select: { name: true, avatarUrl: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getDealById(dealId: string, organizationId: string) {
    return prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
      include: {
        contact: true,
        company: true,
        assignedTo: {
          include: { user: { select: { name: true, avatarUrl: true } } },
        },
      },
    });
  },

  async createDeal(
    data: {
      title: string;
      stage: DealStage;
      status?: string;
      contactId?: string;
      companyId?: string;
      organizationId: string;
      assignedToId?: string;
      value?: number;
      source?: string;
    },
    memberId?: string,
  ) {
    await Promise.all([
      assertCrmLinksBelongToOrganization(data.organizationId, data),
      assertMemberBelongsToOrganization(data.organizationId, data.assignedToId),
    ]);

    const newDeal = await prisma.deal.create({
      data: {
        title: data.title,
        stage: data.stage,
        status: data.status,
        contactId: data.contactId,
        companyId: data.companyId,
        organizationId: data.organizationId,
        assignedToId: data.assignedToId,
        value: data.value,
        source: data.source,
        createdById: memberId,
      },
    });

    if (memberId) {
      await ActivityLogService.log({
        organizationId: data.organizationId,
        memberId,
        entity: { entityType: "deal", entityId: newDeal.id },
        activityType: ActivityType.CREATION,
        title: "Deal created",
      });
    }

    try {
      await NotificationsService.notifyDealAssignment({
        organizationId: data.organizationId,
        dealId: newDeal.id,
        dealTitle: newDeal.title,
        assignedToId: newDeal.assignedToId,
        actorMemberId: memberId,
      });
    } catch (error) {
      console.error("[deals] failed to enqueue deal notifications", {
        dealId: newDeal.id,
        error,
      });
    }

    return newDeal;
  },

  async updateDealStage(
    dealId: string,
    newStage: DealStage,
    organizationId: string,
    memberId: string,
  ) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
    });
    if (!deal) throw new Error("Deal not found");
    const oldStage = deal.stage;

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: newStage,
        wonAt: newStage === DealStage.WON ? new Date() : null,
        lostAt: newStage === DealStage.LOST ? new Date() : null,
      },
    });

    await ActivityLogService.log({
      organizationId,
      memberId,
      entity: { entityType: "deal", entityId: dealId },
      activityType: ActivityType.STAGE_CHANGE,
      title: `Stage changed from "${oldStage}" to "${newStage}"`,
      metadata: { field: "stage", from: oldStage, to: newStage },
    });

    return updated;
  },

  async updateDealStatus(
    dealId: string,
    newStatus: string,
    organizationId: string,
    memberId: string,
  ) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
    });
    if (!deal) throw new Error("Deal not found");
    const oldStatus = deal.status;

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { status: newStatus },
    });

    await ActivityLogService.log({
      organizationId,
      memberId,
      entity: { entityType: "deal", entityId: dealId },
      activityType: ActivityType.STATUS_CHANGE,
      title: `Status changed from "${oldStatus || "None"}" to "${newStatus}"`,
      metadata: { field: "status", from: oldStatus, to: newStatus },
    });

    return updated;
  },

  async updateDealField(
    dealId: string,
    field: "title" | "value" | "source" | "lostReason",
    value: string,
    organizationId: string,
    memberId: string,
  ) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
    });
    if (!deal) throw new Error("Deal not found");
    const oldValue = deal[field];

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { [field]: value || null },
    });

    await ActivityLogService.log({
      organizationId,
      memberId,
      entity: { entityType: "deal", entityId: dealId },
      activityType: ActivityType.STATUS_CHANGE,
      title: `Updated ${field} from "${oldValue || "N/A"}" to "${value || "N/A"}"`,
      metadata: { field, from: oldValue, to: value },
    });

    return updated;
  },

  async assignDeal(
    dealId: string,
    assignedToId: string,
    assignedToName: string,
    organizationId: string,
    memberId: string,
  ) {
    await assertMemberBelongsToOrganization(organizationId, assignedToId);

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
    });
    if (!deal) throw new Error("Deal not found");

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { assignedToId },
      include: {
        assignedTo: { include: { user: { select: { name: true } } } },
      },
    });

    await ActivityLogService.log({
      organizationId,
      memberId,
      entity: { entityType: "deal", entityId: dealId },
      activityType: ActivityType.ASSIGNMENT,
      title: `Deal assigned to ${assignedToName}`,
      metadata: { assignedToId },
    });

    try {
      await NotificationsService.notifyDealAssignment({
        organizationId,
        dealId,
        dealTitle: updated.title,
        assignedToId,
        actorMemberId: memberId,
      });
    } catch (error) {
      console.error("[deals] failed to enqueue deal notifications", {
        dealId,
        error,
      });
    }

    return updated;
  },

  async updateDealRelation(
    dealId: string,
    field: "contactId" | "companyId",
    value: string | null,
    entityName: string,
    organizationId: string,
    memberId: string,
  ) {
    await assertCrmLinksBelongToOrganization(organizationId, {
      [field]: value,
    });

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
    });
    if (!deal) throw new Error("Deal not found");

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { [field]: value },
    });

    const label = field === "contactId" ? "Contact" : "Company";
    await ActivityLogService.log({
      organizationId,
      memberId,
      entity: { entityType: "deal", entityId: dealId },
      activityType: ActivityType.STATUS_CHANGE,
      title: `${label} updated to "${entityName || "None"}"`,
      metadata: { field, to: value },
    });

    return updated;
  },

  async deleteDeal(data: {
    dealId: string;
    organizationId: string;
    memberId: string;
    canDeleteAny: boolean;
  }) {
    const result = await prisma.deal.updateMany({
      where: {
        id: data.dealId,
        organizationId: data.organizationId,
        deletedAt: null,
        ...(data.canDeleteAny ? {} : { createdById: data.memberId }),
      },
      data: { deletedAt: new Date() },
    });

    if (result.count === 0) {
      const exists = await prisma.deal.findFirst({
        where: {
          id: data.dealId,
          organizationId: data.organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (exists) throw new Error("You can only delete deals you created.");
      throw new Error("Deal not found.");
    }

    await ActivityLogService.log({
      organizationId: data.organizationId,
      memberId: data.memberId,
      entity: { entityType: "deal", entityId: data.dealId },
      activityType: ActivityType.STATUS_CHANGE,
      title: "Deal deleted",
    });

    try {
      await NotificationsService.cancelPendingDealNotifications(data.dealId, data.organizationId);
    } catch (error) {
      console.error("[deals] failed to enqueue deal notifications", {
        dealId: data.dealId,
        error,
      });
    }
  },
};
