import { prisma } from "@/lib/db/client";
import { RecordActivityService } from "./record.activity.service";
import { NotificationsService } from "@/modules/notifications/service";

export const RecordsManagementService = {
  async archiveRecord(input: {
    organizationId: string;
    recordId: string;
    memberId: string;
    canDeleteAny: boolean;
  }) {
    const record = await prisma.recordItem.findFirst({
      where: {
        id: input.recordId,
        organizationId: input.organizationId,
        archivedAt: null,
        ...(input.canDeleteAny ? {} : { ownerId: input.memberId }),
      },
      select: { id: true, displayName: true },
    });
    if (!record) return false;

    const result = await prisma.recordItem.updateMany({
      where: {
        id: input.recordId,
        organizationId: input.organizationId,
        archivedAt: null,
        ...(input.canDeleteAny ? {} : { ownerId: input.memberId }),
      },
      data: { archivedAt: new Date() },
    });

    const archived = result.count > 0;
    if (archived) {
      await RecordActivityService.archived({
        organizationId: input.organizationId,
        memberId: input.memberId,
        recordId: input.recordId,
        recordName: record.displayName,
      });
    }
    return archived;
  },

  async transferRecordOwnership(input: {
    organizationId: string;
    recordId: string;
    ownerId: string;
    memberId: string;
    canUpdateAny: boolean;
  }) {
    const owner = await prisma.member.findFirst({
      where: {
        id: input.ownerId,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!owner) return false;

    const record = await prisma.recordItem.findFirst({
      where: {
        id: input.recordId,
        organizationId: input.organizationId,
        archivedAt: null,
        ...(input.canUpdateAny ? {} : { ownerId: input.memberId }),
      },
      select: {
        displayName: true,
        module: { select: { key: true } },
        owner: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
    if (!record) return false;
    if (record.owner.id === owner.id) return true;

    const result = await prisma.recordItem.updateMany({
      where: {
        id: input.recordId,
        organizationId: input.organizationId,
        archivedAt: null,
        ...(input.canUpdateAny ? {} : { ownerId: input.memberId }),
      },
      data: { ownerId: input.ownerId },
    });

    const transferred = result.count > 0;
    if (transferred) {
      await RecordActivityService.ownershipTransferred({
        organizationId: input.organizationId,
        memberId: input.memberId,
        recordId: input.recordId,
        previousOwnerId: record.owner.id,
        previousOwnerName: record.owner.user.name ?? record.owner.user.email,
        nextOwnerId: owner.id,
        nextOwnerName: owner.user.name ?? owner.user.email,
      });
      if (owner.id !== input.memberId) {
        try {
          await NotificationsService.notifyRecordAssignment({
            organizationId: input.organizationId,
            moduleKey: record.module.key,
            recordId: input.recordId,
            recordName: record.displayName,
            assignedToId: owner.id,
            actorMemberId: input.memberId,
          });
        } catch (error) {
          console.error("[records] failed to enqueue assignment notification", {
            recordId: input.recordId,
            error,
          });
        }
      }
    }
    return transferred;
  },
};
