"use server";

import { Prisma } from "@/generated/prisma/client";
import type { ModuleFeature } from "@/generated/prisma/enums";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { z } from "zod";
import RecordModuleService from "../service";
import { isEmptyValue, parseRecordValues } from "./helpers";
import {
	linkableModuleFeatureSchema,
	recordPageQuerySchema,
} from "./schemas";
import type {
	MutateRecordResult,
	SaveRecordResult,
} from "./types";

export async function getRecordModulePage(
	moduleKey: string,
	query?: Partial<z.input<typeof recordPageQuerySchema>>,
) {
	const session = await getSessionClaims();
	const ctx = createQueryContext(session);
	ctx.assertCan("records.read");
	const parsedQuery = recordPageQuerySchema.parse(query ?? {});
	const recordModulePage = await RecordModuleService.getModulePageData(
		moduleKey,
		session.organizationId,
		parsedQuery,
	);
	if (!recordModulePage) return null;

	return {
		...recordModulePage,
		canTransferOwnership: ctx.can("records.update.any"),
	};
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

export async function patchModuleRecordFields(
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

		const fieldsByKey = new Map(recordModule.fields.map((field) => [field.key, field]));
		const suppliedKeys = Object.keys(rawValues);
		if (suppliedKeys.length === 0) {
			return { success: false, error: "At least one record field is required." };
		}
		if (suppliedKeys.some((key) => !fieldsByKey.has(key))) {
			return { success: false, error: "One or more record fields are invalid." };
		}

		const suppliedFields = suppliedKeys.map((key) => fieldsByKey.get(key)!);
		const parsed = parseRecordValues(suppliedFields, rawValues, false);
		if (!parsed.success) return { success: false, error: parsed.error };

		const valueFieldIds = suppliedFields
			.filter((field) => field.type !== "RELATIONSHIP")
			.map((field) => field.id);
		const relationshipFieldIds = suppliedFields
			.filter((field) => field.type === "RELATIONSHIP")
			.map((field) => field.id);
		const primaryField = suppliedFields.find((field) => field.isPrimary);

		const record = await RecordModuleService.patchRecordFields({
			organizationId: session.organizationId,
			moduleId: recordModule.id,
			recordId,
			values: parsed.values,
			valueFieldIds,
			relationships: parsed.relationships,
			relationshipFieldIds,
			displayName: primaryField && !isEmptyValue(rawValues[primaryField.key])
				? parsed.displayName
				: undefined,
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
		console.error("Failed to patch module record fields", error);
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

export async function getRelationshipFieldOptions(fieldId: string) {
	const session = await getSessionClaims();
	createQueryContext(session).assertCan("records.read");
	return RecordModuleService.getRelationshipFieldOptions(
		fieldId,
		session.organizationId,
	);
}
