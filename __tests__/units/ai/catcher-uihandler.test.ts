/** @jest-environment node */

import { prisma } from "@/lib/db/client";
import prepareUserFacingResponse from "@/modules/ai/features/catcher/services/uihandler.service";
import type { CatcherResponse } from "@/modules/ai/features/catcher/types";

jest.mock("@/lib/db/client", () => ({
	prisma: {
		recordModule: { findMany: jest.fn() },
		recordItem: { findMany: jest.fn() },
	},
}));

const mockFindModules = jest.mocked(prisma.recordModule.findMany);
const mockFindRecords = jest.mocked(prisma.recordItem.findMany);

describe("catcher user-facing response preparation", () => {
	beforeEach(() => jest.clearAllMocks());

	test("rejects a relationship value from the wrong target module", async () => {
		mockFindModules.mockResolvedValue([
			{
				id: "module_orders",
				name: "Orders",
				icon: "BoxFilled",
				accentColor: null,
				features: [],
				fields: [
					{
						id: "field_name",
						label: "Name",
						type: "TEXT",
						isPrimary: true,
						relationshipDefinition: null,
					},
					{
						id: "field_lead",
						label: "Lead",
						type: "RELATIONSHIP",
						isPrimary: false,
						relationshipDefinition: { targetModuleId: "module_leads" },
					},
				],
			},
		] as never);
		mockFindRecords.mockResolvedValue([
			{
				id: "record_order",
				moduleId: "module_orders",
				displayName: "Order 100",
				module: {
					name: "Orders",
					icon: "BoxFilled",
					accentColor: null,
					features: [],
				},
			},
		] as never);
		const response: CatcherResponse = {
			kind: "proposal",
			runId: "run_1",
			summary: "Create order",
			actions: [
				{
					id: "action_1",
					type: "record.create",
					moduleId: "module_orders",
					values: [
						{ fieldId: "field_name", value: "Order 101" },
						{ fieldId: "field_lead", value: "record_order" },
					],
				},
			],
		};

		const prepared = await prepareUserFacingResponse("org_1", response);

		expect(prepared).toEqual(expect.objectContaining({
			kind: "error",
			error: expect.stringContaining("does not match"),
		}));
	});

	test("keeps a task standalone when its record module lacks tasks", async () => {
		mockFindModules.mockResolvedValue([]);
		mockFindRecords.mockResolvedValue([
			{
				id: "record_lead",
				moduleId: "module_leads",
				displayName: "Annabelle",
				module: {
					name: "Leads",
					icon: "TargetFilled",
					accentColor: "#ff5a43",
					features: [],
				},
			},
		] as never);
		const response: CatcherResponse = {
			kind: "proposal",
			runId: "run_2",
			summary: "Follow up",
			actions: [
				{
					id: "action_2",
					type: "task.create",
					name: "Follow up with Annabelle about her most recent order",
					description: null,
					dueDate: "2026-08-24",
					recordId: "record_lead",
					recordActionId: null,
				},
			],
		};

		const prepared = await prepareUserFacingResponse("org_1", response);

		expect(prepared.kind).toBe("proposal");
		if (prepared.kind !== "proposal") return;
		expect(prepared.actions[0]).toEqual(expect.objectContaining({
			type: "task.create",
			recordId: null,
		}));
	});
});