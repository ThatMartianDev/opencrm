"use server";

import { Prisma } from "@/generated/prisma/client";
import {
	ModuleFeature,
	RecordFieldType,
	RecordViewType,
} from "@/generated/prisma/enums";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { z } from "zod";
import RecordModuleService from "./service";
import type {
	ModuleDetails,
	ModuleViewDraft,
	RecordFieldDraft,
} from "./ui/RecordModuleBuilder/types";

const moduleIconSchema = z.enum([
	"TargetFilled",
	"PeopleFilled",
	"MoneyFilled",
	"PersonFilled",
	"BuildingFilled",
	"DocumentFilled",
	"CalendarFilled",
	"TagFilled",
	"BoxFilled",
	"FolderFilled",
	"ChartMultipleFilled",
	"LocationFilled",
	"ShieldFilled",
	"StarFilled",
]);

const supportedRecordFieldTypeSchema = z.enum([
	RecordFieldType.TEXT,
	RecordFieldType.NUMBER,
	RecordFieldType.CURRENCY,
	RecordFieldType.EMAIL,
	RecordFieldType.PHONE,
	RecordFieldType.DATE,
	RecordFieldType.DATETIME,
	RecordFieldType.SELECT,
	RecordFieldType.MULTI_SELECT,
	RecordFieldType.RELATIONSHIP,
]);

const implementedModuleFeatureSchema = z.enum([
	ModuleFeature.NOTES,
	ModuleFeature.TASKS,
	ModuleFeature.FILES,
]);

const linkableModuleFeatureSchema = z.enum([
	ModuleFeature.NOTES,
	ModuleFeature.TASKS,
]);

const fieldConfigSchema = z
	.object({
		options: z
			.array(
				z.object({
					label: z.string().trim().min(1).max(100),
					value: z.string().trim().min(1).max(200),
					color: z.string().trim().min(1).max(50),
				}),
			)
			.optional(),
		currency: z.string().trim().min(1).max(10).optional(),
		minimum: z.number().finite().optional(),
		maximum: z.number().finite().optional(),
		isPrimaryEmail: z.boolean().optional(),
	})
	.nullable();

const fieldSchema = z
	.object({
		key: z.string().trim().min(1).max(100).regex(/^[a-z0-9_]+$/),
		label: z.string().trim().min(1).max(200),
		type: supportedRecordFieldTypeSchema,
		required: z.boolean(),
		unique: z.boolean(),
		defaultValue: z.json().nullable(),
		isPrimary: z.boolean(),
		position: z.number().int().nonnegative(),
		config: fieldConfigSchema,
		relationshipTargetModuleId: z.string().cuid().nullable().optional().default(null),
	})
	.superRefine((field, context) => {
		if (
			field.type === RecordFieldType.RELATIONSHIP &&
			!field.relationshipTargetModuleId
		) {
			context.addIssue({
				code: "custom",
				path: ["relationshipTargetModuleId"],
				message: "Relationship fields require a target module.",
			});
		}
		if (
			field.type !== RecordFieldType.RELATIONSHIP &&
			field.relationshipTargetModuleId
		) {
			context.addIssue({
				code: "custom",
				path: ["relationshipTargetModuleId"],
				message: "Only relationship fields can target another module.",
			});
		}
		if (field.type === RecordFieldType.RELATIONSHIP && field.unique) {
			context.addIssue({
				code: "custom",
				path: ["unique"],
				message: "Relationship fields cannot be marked unique.",
			});
		}
		if (
			field.isPrimary &&
			(field.type !== RecordFieldType.TEXT || !field.required)
		) {
			context.addIssue({
				code: "custom",
				path: ["isPrimary"],
				message: "The record title must be a required text field.",
			});
		}

		const options = field.config?.options ?? [];
		if (
			field.type === RecordFieldType.SELECT ||
			field.type === RecordFieldType.MULTI_SELECT
		) {
			if (options.length === 0) {
				context.addIssue({
					code: "custom",
					path: ["config", "options"],
					message: "Select fields require at least one option.",
				});
			}
			if (new Set(options.map((option) => option.value)).size !== options.length) {
				context.addIssue({
					code: "custom",
					path: ["config", "options"],
					message: "Select option values must be unique.",
				});
			}
		}

		if (
			field.config?.minimum !== undefined &&
			field.config?.maximum !== undefined &&
			field.config.minimum > field.config.maximum
		) {
			context.addIssue({
				code: "custom",
				path: ["config"],
				message: "Minimum cannot be greater than maximum.",
			});
		}

		if (field.defaultValue !== null) {
			const defaultValue = field.defaultValue;
			let isValidDefault = false;

			switch (field.type) {
				case RecordFieldType.NUMBER:
				case RecordFieldType.CURRENCY:
					isValidDefault =
						typeof defaultValue === "number" &&
						Number.isFinite(defaultValue) &&
						(field.config?.minimum === undefined ||
							defaultValue >= field.config.minimum) &&
						(field.config?.maximum === undefined ||
							defaultValue <= field.config.maximum);
					break;
				case RecordFieldType.EMAIL:
					isValidDefault = z.string().email().safeParse(defaultValue).success;
					break;
				case RecordFieldType.DATE:
				case RecordFieldType.DATETIME:
					isValidDefault =
						typeof defaultValue === "string" &&
						!Number.isNaN(Date.parse(defaultValue));
					break;
				case RecordFieldType.SELECT:
					isValidDefault =
						typeof defaultValue === "string" &&
						options.some((option) => option.value === defaultValue);
					break;
				case RecordFieldType.MULTI_SELECT:
					isValidDefault =
						Array.isArray(defaultValue) &&
						new Set(defaultValue).size === defaultValue.length &&
						defaultValue.every(
							(value) =>
								typeof value === "string" &&
								options.some((option) => option.value === value),
						);
					break;
				default:
					isValidDefault =
						typeof defaultValue === "string" &&
						defaultValue.trim().length > 0;
			}

			if (!isValidDefault) {
				context.addIssue({
					code: "custom",
					path: ["defaultValue"],
					message: "The default value is invalid for this field.",
				});
			}
		}
	});

const listViewSchema = z.object({
	name: z.string().trim().min(1).max(100),
	type: z.literal(RecordViewType.LIST),
	position: z.number().int().nonnegative(),
	isDefault: z.boolean(),
	config: z.object({
		columns: z.array(z.string().min(1)).max(100),
	}),
});

const kanbanViewSchema = z.object({
	name: z.string().trim().min(1).max(100),
	type: z.literal(RecordViewType.KANBAN),
	position: z.number().int().nonnegative(),
	isDefault: z.boolean(),
	config: z.object({
		groupByField: z.string().min(1).nullable(),
		cardFields: z.array(z.string().min(1)).max(100),
	}),
});

const createRecordModuleSchema = z
	.object({
		moduleDetails: z.object({
			name: z.string().trim().min(1, "Module name is required.").max(100),
			pluralName: z
				.string()
				.trim()
				.min(1, "Plural name is required.")
				.max(100),
			icon: moduleIconSchema,
			accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color."),
		}),
		dataFields: z.array(fieldSchema).min(1, "Add at least one data field."),
		moduleViews: z
			.array(z.discriminatedUnion("type", [listViewSchema, kanbanViewSchema]))
			.min(1, "Enable at least one module view."),
		moduleFeatures: z.array(implementedModuleFeatureSchema).max(3),
	})
	.superRefine((data, context) => {
		const fieldKeys = new Set(data.dataFields.map((field) => field.key));
		if (fieldKeys.size !== data.dataFields.length) {
			context.addIssue({
				code: "custom",
				path: ["dataFields"],
				message: "Data field keys must be unique.",
			});
		}

		if (data.dataFields.filter((field) => field.isPrimary).length !== 1) {
			context.addIssue({
				code: "custom",
				path: ["dataFields"],
				message: "Choose exactly one record title field.",
			});
		}

		if (data.moduleViews.filter((view) => view.isDefault).length !== 1) {
			context.addIssue({
				code: "custom",
				path: ["moduleViews"],
				message: "Choose exactly one default view.",
			});
		}

		for (const view of data.moduleViews) {
			const referencedKeys =
				view.type === RecordViewType.LIST
					? view.config.columns
					: [view.config.groupByField, ...view.config.cardFields].filter(
							(key): key is string => key !== null,
						);

			if (referencedKeys.some((key) => !fieldKeys.has(key))) {
				context.addIssue({
					code: "custom",
					path: ["moduleViews"],
					message: `The ${view.name} configuration references a missing field.`,
				});
			}

			if (view.type === RecordViewType.KANBAN && view.config.groupByField) {
				const groupField = data.dataFields.find(
					(field) => field.key === view.config.groupByField,
				);
				if (
					groupField?.type !== RecordFieldType.SELECT &&
					groupField?.type !== RecordFieldType.MULTI_SELECT
				) {
					context.addIssue({
						code: "custom",
						path: ["moduleViews"],
						message:
							"Board views must group records by a select or multi-select field.",
					});
				}
			}
		}
	});

export type CreateRecordModulePayload = {
	moduleDetails: ModuleDetails;
	dataFields: RecordFieldDraft[];
	moduleViews: ModuleViewDraft[];
	moduleFeatures: ModuleFeature[];
};

export type CreateRecordModuleResult =
	| { success: true; moduleId: string }
	| { success: false; error: string };

export type UpdateRecordModuleResult =
	| { success: true }
	| { success: false; error: string };

export type SaveRecordResult =
	| { success: true; recordId: string }
	| { success: false; error: string };

export type MutateRecordResult =
	| { success: true }
	| { success: false; error: string };

export type SaveListViewResult =
	| { success: true }
	| { success: false; error: string };

export type CreateRecordFieldResult =
	| { success: true; fieldId: string }
	| { success: false; error: string };

const listColumnsSchema = z
	.array(z.string().trim().min(1))
	.max(100)
	.refine((columns) => new Set(columns).size === columns.length, {
		message: "A field can only appear once in a view.",
	});

const recordPageQuerySchema = z.object({
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().min(1).max(100).default(50),
	search: z.string().trim().max(200).default(""),
});

const isEmptyValue = (value: unknown) =>
	value === null ||
	value === undefined ||
	value === "" ||
	(Array.isArray(value) && value.length === 0);

const getConfiguredOptions = (config: unknown) => {
	if (!config || typeof config !== "object" || Array.isArray(config)) return [];
	const options = (config as { options?: unknown }).options;
	if (!Array.isArray(options)) return [];

	return options.filter(
		(option): option is { label: string; value: string; color?: string } =>
			typeof option === "object" &&
			option !== null &&
			typeof (option as { label?: unknown }).label === "string" &&
			typeof (option as { value?: unknown }).value === "string",
	);
};

const getNumericBounds = (config: unknown) => {
	if (!config || typeof config !== "object" || Array.isArray(config)) {
		return {};
	}

	const { minimum, maximum } = config as {
		minimum?: unknown;
		maximum?: unknown;
	};
	return {
		minimum: typeof minimum === "number" ? minimum : undefined,
		maximum: typeof maximum === "number" ? maximum : undefined,
	};
};

type ParsedRecordValues =
	| {
			success: true;
			values: {
				fieldId: string;
				value: Prisma.InputJsonValue;
			}[];
			relationships: {
				fieldId: string;
				targetRecordId: string;
			}[];
			displayName: string;
	  }
	| { success: false; error: string };

const parseRecordValues = (
	fields: NonNullable<
		Awaited<ReturnType<typeof RecordModuleService.getModulePageData>>
	>["fields"],
	rawValues: Record<string, unknown>,
	applyDefaults: boolean,
): ParsedRecordValues => {
	const values: {
		fieldId: string;
		value: Prisma.InputJsonValue;
	}[] = [];
	const relationships: {
		fieldId: string;
		targetRecordId: string;
	}[] = [];
	let displayName = "Untitled record";

	for (const field of fields) {
		let rawValue = rawValues[field.key];
		if (
			applyDefaults &&
			isEmptyValue(rawValue) &&
			field.defaultValue !== null
		) {
			rawValue = field.defaultValue;
		}
		if (isEmptyValue(rawValue)) {
			if (field.required) {
				return { success: false, error: `${field.label} is required.` };
			}
			continue;
		}

		let value: Prisma.InputJsonValue;
		switch (field.type) {
			case RecordFieldType.RELATIONSHIP:
				if (typeof rawValue !== "string" || !rawValue.trim()) {
					return {
						success: false,
						error: `Choose a valid ${field.label} record.`,
					};
				}
				relationships.push({
					fieldId: field.id,
					targetRecordId: rawValue,
				});
				continue;
			case RecordFieldType.NUMBER:
			case RecordFieldType.CURRENCY:
			case RecordFieldType.PERCENT:
				if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
					return { success: false, error: `${field.label} must be a valid number.` };
				}
				const { minimum, maximum } = getNumericBounds(field.config);
				if (minimum !== undefined && rawValue < minimum) {
					return { success: false, error: `${field.label} must be at least ${minimum}.` };
				}
				if (maximum !== undefined && rawValue > maximum) {
					return { success: false, error: `${field.label} must be at most ${maximum}.` };
				}
				value = rawValue;
				break;
			case RecordFieldType.BOOLEAN:
				if (typeof rawValue !== "boolean") {
					return { success: false, error: `${field.label} must be true or false.` };
				}
				value = rawValue;
				break;
			case RecordFieldType.DATE:
			case RecordFieldType.DATETIME:
				if (
					typeof rawValue !== "string" ||
					Number.isNaN(Date.parse(rawValue))
				) {
					return { success: false, error: `${field.label} must be a valid date.` };
				}
				value = rawValue;
				break;
			case RecordFieldType.EMAIL:
				if (!z.string().email().safeParse(rawValue).success) {
					return { success: false, error: `${field.label} must be a valid email.` };
				}
				value = rawValue as string;
				break;
			case RecordFieldType.URL:
				if (!z.string().url().safeParse(rawValue).success) {
					return { success: false, error: `${field.label} must be a valid URL.` };
				}
				value = rawValue as string;
				break;
			case RecordFieldType.SELECT: {
				const options = getConfiguredOptions(field.config);
				if (
					typeof rawValue !== "string" ||
					!options.some((option) => option.value === rawValue)
				) {
					return { success: false, error: `Choose a valid ${field.label} option.` };
				}
				value = rawValue;
				break;
			}
			case RecordFieldType.MULTI_SELECT: {
				const options = getConfiguredOptions(field.config);
				if (
					!Array.isArray(rawValue) ||
					new Set(rawValue).size !== rawValue.length ||
					!rawValue.every(
						(item) =>
							typeof item === "string" &&
							options.some((option) => option.value === item),
					)
				) {
					return { success: false, error: `Choose valid ${field.label} options.` };
				}
				value = rawValue as string[];
				break;
			}
			default:
				if (typeof rawValue !== "string") {
					return { success: false, error: `${field.label} must be text.` };
				}
				value = rawValue.trim();
		}

		if (value === "") {
			if (field.required) {
				return { success: false, error: `${field.label} is required.` };
			}
			continue;
		}

		if (field.isPrimary) {
			displayName = Array.isArray(value) ? value.join(", ") : String(value);
		}
		values.push({ fieldId: field.id, value });
	}

	return { success: true, values, relationships, displayName };
};

export async function getRecordModulePage(
	moduleKey: string,
	query?: Partial<z.input<typeof recordPageQuerySchema>>,
) {
	const session = await getSessionClaims();
	createQueryContext(session).assertCan("records.read");
	const parsedQuery = recordPageQuerySchema.parse(query ?? {});
	return RecordModuleService.getModulePageData(
		moduleKey,
		session.organizationId,
		parsedQuery,
	);
}

export async function getLinkableRecords(requiredFeature: ModuleFeature) {
	const session = await getSessionClaims();
	createQueryContext(session).assertCan("records.read");
	const feature = linkableModuleFeatureSchema.parse(requiredFeature);
	return RecordModuleService.getLinkableRecords(
		session.organizationId,
		feature,
	);
}

export async function getLinkableRecord(
	recordId: string,
	requiredFeature: ModuleFeature,
) {
	const session = await getSessionClaims();
	createQueryContext(session).assertCan("records.read");
	const feature = linkableModuleFeatureSchema.parse(requiredFeature);
	return RecordModuleService.getLinkableRecord(
		recordId,
		session.organizationId,
		feature,
	);
}

export async function getRecordModuleRecord(
	moduleKey: string,
	recordId: string,
) {
	const session = await getSessionClaims();
	const ctx = createQueryContext(session);
	ctx.assertCan("records.read");
	const record = await RecordModuleService.getRecord(
		moduleKey,
		recordId,
		session.organizationId,
	);
	if (!record) return null;

	return {
		...record,
		canTransferOwnership:
			ctx.can("records.update.any") ||
			(ctx.can("records.update.own") && record.ownerId === session.memberId),
	};
}

export async function createModuleRecord(
	moduleKey: string,
	rawValues: Record<string, unknown>,
	ownerId?: string,
): Promise<SaveRecordResult> {
	try {
		const session = await getSessionClaims();
		const ctx = createQueryContext(session);
		ctx.assertCan("records.create");
		if (ownerId && ownerId !== session.memberId) {
			if (!ctx.can("records.update.any")) ctx.assertCan("records.update.own");
		}
		const recordModule = await RecordModuleService.getModulePageData(
			moduleKey,
			session.organizationId,
		);
		if (!recordModule) return { success: false, error: "Module not found." };

		const parsed = parseRecordValues(recordModule.fields, rawValues, true);
		if (!parsed.success) return { success: false, error: parsed.error };

		const record = await RecordModuleService.createRecord({
			organizationId: session.organizationId,
			moduleId: recordModule.id,
			createdById: session.memberId,
			ownerId: ownerId ?? session.memberId,
			displayName: parsed.displayName,
			values: parsed.values,
			relationships: parsed.relationships,
		});
		return record
			? { success: true, recordId: record.id }
			: { success: false, error: "The selected owner is not a workspace member." };
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Forbidden:")) {
			return { success: false, error: "You do not have permission to create records." };
		}
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return { success: false, error: "A record already uses a value that must be unique." };
		}
		console.error("Failed to create module record", error);
		return { success: false, error: "Unable to create the record." };
	}
}

export async function updateModuleRecord(
	moduleKey: string,
	recordId: string,
	rawValues: Record<string, unknown>,
): Promise<SaveRecordResult> {
	try {
		const session = await getSessionClaims();
		const ctx = createQueryContext(session);
		const canUpdateAny = ctx.can("records.update.any");
		if (!canUpdateAny) ctx.assertCan("records.update.own");
		const recordModule = await RecordModuleService.getModulePageData(
			moduleKey,
			session.organizationId,
		);
		if (!recordModule) return { success: false, error: "Module not found." };

		const parsed = parseRecordValues(recordModule.fields, rawValues, false);
		if (!parsed.success) return { success: false, error: parsed.error };

		const record = await RecordModuleService.updateRecord({
			organizationId: session.organizationId,
			moduleId: recordModule.id,
			recordId,
			displayName: parsed.displayName,
			values: parsed.values,
			relationships: parsed.relationships,
			memberId: session.memberId,
			canUpdateAny,
		});
		return record
			? { success: true, recordId: record.id }
			: { success: false, error: "Record not found or you do not own it" };
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Forbidden:")) {
			return { success: false, error: "You do not have permission to update records." };
		}
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return { success: false, error: "A record already uses a value that must be unique." };
		}
		console.error("Failed to update module record", error);
		return { success: false, error: "Unable to update the record." };
	}
}

export async function archiveModuleRecord(
	recordId: string,
): Promise<MutateRecordResult> {
	try {
		const session = await getSessionClaims();
		const ctx = createQueryContext(session);
		const canDeleteAny = ctx.can("records.delete.any");
		if (!canDeleteAny) ctx.assertCan("records.delete.own");

		const archived = await RecordModuleService.archiveRecord({
			organizationId: session.organizationId,
			recordId,
			memberId: session.memberId,
			canDeleteAny,
		});

		return archived
			? { success: true }
			: { success: false, error: "Record not found or you do not own it." };
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Forbidden:")) {
			return { success: false, error: "You do not have permission to delete records." };
		}
		console.error("Failed to archive module record", error);
		return { success: false, error: "Unable to archive the record." };
	}
}

export async function transferModuleRecordOwnership(
	recordId: string,
	ownerId: string,
): Promise<MutateRecordResult> {
	try {
		const session = await getSessionClaims();
		const ctx = createQueryContext(session);
		const canUpdateAny = ctx.can("records.update.any");
		if (!canUpdateAny) ctx.assertCan("records.update.own");

		const transferred = await RecordModuleService.transferRecordOwnership({
			organizationId: session.organizationId,
			recordId,
			ownerId,
			memberId: session.memberId,
			canUpdateAny,
		});

		return transferred
			? { success: true }
			: { success: false, error: "Record or new owner not found." };
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Forbidden:")) {
			return { success: false, error: "You do not have permission to transfer this record." };
		}
		console.error("Failed to transfer module record ownership", error);
		return { success: false, error: "Unable to transfer record ownership." };
	}
}

export async function saveRecordListViewColumns(
	moduleKey: string,
	viewId: string,
	columns: string[],
): Promise<SaveListViewResult> {
	try {
		const session = await getSessionClaims();
		createQueryContext(session).assertCan("workspace.manage");
		const parsedColumns = listColumnsSchema.safeParse(columns);
		if (!parsedColumns.success) {
			return {
				success: false,
				error: parsedColumns.error.issues[0]?.message ?? "Invalid columns.",
			};
		}

		const recordModule = await RecordModuleService.getModulePageData(
			moduleKey,
			session.organizationId,
		);
		if (!recordModule) return { success: false, error: "Module not found." };

		const view = await RecordModuleService.updateListViewColumns({
			organizationId: session.organizationId,
			moduleId: recordModule.id,
			viewId,
			columns: parsedColumns.data,
		});
		return view
			? { success: true }
			: { success: false, error: "The list view or selected fields are invalid." };
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Forbidden:")) {
			return { success: false, error: "Only workspace owners can update views." };
		}
		console.error("Failed to update list view columns", error);
		return { success: false, error: "Unable to update the list view." };
	}
}

export async function createRecordModuleField(
	moduleKey: string,
	viewId: string,
	field: RecordFieldDraft,
): Promise<CreateRecordFieldResult> {
	try {
		const session = await getSessionClaims();
		createQueryContext(session).assertCan("workspace.manage");
		const parsedField = fieldSchema.safeParse(field);
		if (!parsedField.success) {
			return {
				success: false,
				error: parsedField.error.issues[0]?.message ?? "Invalid field settings.",
			};
		}
		if (parsedField.data.isPrimary) {
			return { success: false, error: "This module already has a record title." };
		}

		const recordModule = await RecordModuleService.getModulePageData(
			moduleKey,
			session.organizationId,
		);
		if (!recordModule) return { success: false, error: "Module not found." };

		const createdField = await RecordModuleService.createFieldInListView({
			organizationId: session.organizationId,
			moduleId: recordModule.id,
			viewId,
			field: parsedField.data,
		});
		return createdField
			? { success: true, fieldId: createdField.id }
			: { success: false, error: "List view not found." };
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Forbidden:")) {
			return { success: false, error: "Only workspace owners can add fields." };
		}
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return { success: false, error: "A field with this key already exists." };
		}
		console.error("Failed to create record field", error);
		return { success: false, error: "Unable to create the field." };
	}
}

export async function createRecordModule(
	payload: CreateRecordModulePayload,
): Promise<CreateRecordModuleResult> {
	try {
		const session = await getSessionClaims();
		const context = createQueryContext(session);
		context.assertCan("workspace.manage");

		const parsed = createRecordModuleSchema.safeParse(payload);
		if (!parsed.success) {
			return {
				success: false,
				error: parsed.error.issues[0]?.message ?? "Invalid module settings.",
			};
		}

		const recordModule = await RecordModuleService.createRecordModule({
			organizationId: session.organizationId,
			createdById: session.memberId,
			...parsed.data,
		});

		return { success: true, moduleId: recordModule.id };
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Forbidden:")) {
			return {
				success: false,
				error: "Only workspace owners can create modules.",
			};
		}

		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return {
				success: false,
				error: "A module or field with the same key already exists.",
			};
		}

		console.error("Failed to create record module", error);
		return {
			success: false,
			error: "Unable to create the module. Please try again.",
		};
	}
}

export async function getRecordModuleBuilder(moduleId: string) {
	const session = await getSessionClaims();
	createQueryContext(session).assertCan("workspace.manage");
	return RecordModuleService.getModuleBuilderData(
		moduleId,
		session.organizationId,
	);
}

export async function updateRecordModule(
	moduleId: string,
	payload: CreateRecordModulePayload,
): Promise<UpdateRecordModuleResult> {
	try {
		const session = await getSessionClaims();
		createQueryContext(session).assertCan("workspace.manage");

		const parsed = createRecordModuleSchema.safeParse(payload);
		if (!parsed.success) {
			return {
				success: false,
				error: parsed.error.issues[0]?.message ?? "Invalid module settings.",
			};
		}

		await RecordModuleService.updateRecordModule({
			moduleId,
			organizationId: session.organizationId,
			createdById: session.memberId,
			...parsed.data,
		});
		return { success: true };
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Forbidden:")) {
			return { success: false, error: "Only workspace owners can manage modules." };
		}
		if (
			error instanceof Error &&
			(error.message === "Fields with record data cannot be removed." ||
				error.message ===
					"Relationship fields with record data cannot change type or target module.")
		) {
			return { success: false, error: error.message };
		}
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			return { success: false, error: "A field with the same key already exists." };
		}
		console.error("Failed to update record module", error);
		return { success: false, error: "Unable to update the module." };
	}
}

export async function getRelationshipTargetModules() {
	const session = await getSessionClaims();
	createQueryContext(session).assertCan("workspace.manage");
	return RecordModuleService.getRelationshipTargetModules(session.organizationId);
}

export async function getRelationshipFieldOptions(fieldId: string) {
	const session = await getSessionClaims();
	createQueryContext(session).assertCan("records.read");
	return RecordModuleService.getRelationshipFieldOptions(
		fieldId,
		session.organizationId,
	);
}