import { ModuleFeature } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db/client";

export const RecordRelationshipsService = {
  async getLinkableRecords(
    organizationId: string,
    requiredFeature: ModuleFeature,
  ) {
    return prisma.recordModule.findMany({
      where: {
        organizationId,
        archivedAt: null,
        features: { has: requiredFeature },
      },
      select: {
        id: true,
        key: true,
        name: true,
        pluralName: true,
        icon: true,
        accentColor: true,
        records: {
          where: { archivedAt: null },
          select: { id: true, displayName: true, createdAt: true },
          orderBy: [{ displayName: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  },

  async getLinkableRecord(
    recordId: string,
    organizationId: string,
    requiredFeature: ModuleFeature,
  ) {
    return prisma.recordItem.findFirst({
      where: {
        id: recordId,
        organizationId,
        archivedAt: null,
        module: {
          archivedAt: null,
          features: { has: requiredFeature },
        },
      },
      select: {
        id: true,
        displayName: true,
        module: {
          select: {
            id: true,
            key: true,
            name: true,
            icon: true,
            accentColor: true,
          },
        },
      },
    });
  },

  async getRelationshipFieldOptions(fieldId: string, organizationId: string) {
    const definition = await prisma.recordRelationshipDefinition.findFirst({
      where: {
        fieldId,
        field: {
          module: { organizationId, archivedAt: null },
        },
        targetModule: { organizationId, archivedAt: null },
      },
      select: { targetModuleId: true },
    });
    if (!definition) return [];

    return prisma.recordItem.findMany({
      where: {
        moduleId: definition.targetModuleId,
        organizationId,
        archivedAt: null,
      },
      select: { id: true, displayName: true },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
    });
  },
};
