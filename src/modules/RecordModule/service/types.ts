import type { Prisma } from "@/generated/prisma/client";
import type { ModuleFeature } from "@/generated/prisma/enums";
import type {
	ModuleDetails,
	ModuleViewDraft,
	RecordFieldDraft,
} from "../ui/RecordModuleBuilder/types";

export type CreateRecordModuleInput = {
	organizationId: string;
	createdById: string;
	moduleDetails: ModuleDetails;
	dataFields: RecordFieldDraft[];
	moduleViews: ModuleViewDraft[];
	moduleFeatures: ModuleFeature[];
};

export type UpdateRecordModuleInput = CreateRecordModuleInput & {
	moduleId: string;
};

export type RecordValueInput = {
	fieldId: string;
	value: Prisma.InputJsonValue;
};

export type RecordRelationshipInput = {
	fieldId: string;
	targetRecordId: string;
};

export type RecordPageQuery = {
	page: number;
	pageSize: number;
	search: string;
};