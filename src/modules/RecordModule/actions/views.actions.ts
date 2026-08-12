"use server";

import { Prisma } from "@/generated/prisma/client";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import RecordModuleService from "../service";
import type { RecordFieldDraft } from "../ui/RecordModuleBuilder/types";
import { fieldSchema, listColumnsSchema } from "./schemas";
import type {
	CreateRecordFieldResult,
	SaveListViewResult,
} from "./types";

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
