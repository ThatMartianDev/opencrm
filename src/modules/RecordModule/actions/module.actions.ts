"use server";

import { Prisma } from "@/generated/prisma/client";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import RecordModuleService from "../service";
import { createRecordModuleSchema } from "./schemas";
import type {
	CreateRecordModulePayload,
	CreateRecordModuleResult,
	UpdateRecordModuleResult,
} from "./types";

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
