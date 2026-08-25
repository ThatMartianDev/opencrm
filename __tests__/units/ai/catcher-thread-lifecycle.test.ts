/** @jest-environment node */

import { prisma } from "@/lib/db/client";
import { AiRunStatus } from "@/generated/prisma/enums";
import { HistoryServices } from "@/modules/ai/features/catcher/services/history.service";
import { RunServices } from "@/modules/ai/features/catcher/services/run.service";

jest.mock("@/lib/db/client", () => ({
	prisma: {
		aiThread: { findFirst: jest.fn(), updateMany: jest.fn() },
		$transaction: jest.fn(),
	},
}));
jest.mock(
	"@/modules/ai/features/catcher/services/uihandler.service",
	() => ({ __esModule: true, default: jest.fn() }),
);

describe("catcher thread lifecycle", () => {
	test("archives active threads when the catcher session is discarded", async () => {
		const transaction = {
			aiThread: { updateMany: jest.fn() },
			aiRun: { updateMany: jest.fn() },
			aiRunAction: { updateMany: jest.fn() },
		};
		const runTransaction = prisma.$transaction as unknown as jest.Mock;
		runTransaction.mockImplementationOnce(
			async (callback: (value: typeof transaction) => Promise<unknown>) =>
				callback(transaction),
		);

		await RunServices.discardActiveThreads("org_1", "member_1");

		const threadWhere = {
			organizationId: "org_1",
			memberId: "member_1",
			feature: "quick_catcher",
			status: "ACTIVE",
		};
		expect(transaction.aiRunAction.updateMany).toHaveBeenCalledWith({
			where: {
				status: "PROPOSED",
				run: {
					status: AiRunStatus.AWAITING_APPROVAL,
					thread: threadWhere,
				},
			},
			data: { status: "REJECTED" },
		});
		expect(transaction.aiRun.updateMany).toHaveBeenCalledWith({
			where: {
				status: {
					in: [
						AiRunStatus.PENDING,
						AiRunStatus.RUNNING,
						AiRunStatus.AWAITING_INPUT,
						AiRunStatus.AWAITING_APPROVAL,
					],
				},
				thread: threadWhere,
			},
			data: {
				status: AiRunStatus.CANCELLED,
				completedAt: expect.any(Date),
			},
		});
		expect(transaction.aiThread.updateMany).toHaveBeenCalledWith({
			where: threadWhere,
			data: { status: "ARCHIVED" },
		});
	});

	test("does not restore a thread whose latest run is terminal", async () => {
		const findFirst = prisma.aiThread.findFirst as unknown as jest.Mock;
		findFirst.mockResolvedValue({
			id: "thread_1",
			runs: [
				{
					id: "run_1",
					status: AiRunStatus.COMPLETED,
					response: { kind: "info", runId: "run_1", message: "Done." },
					error: null,
					actions: [],
				},
			],
		});

		await expect(
			HistoryServices.getActiveThread("org_1", "member_1"),
		).resolves.toBeNull();
	});

	test("archives older active threads before starting a fresh run", async () => {
		const transaction = {
			aiThread: {
				findFirst: jest.fn(),
				updateMany: jest.fn().mockResolvedValue({ count: 1 }),
				create: jest.fn().mockResolvedValue({ id: "thread_2" }),
			},
			aiRun: { create: jest.fn().mockResolvedValue({ id: "run_2" }) },
		};
		const runTransaction = prisma.$transaction as unknown as jest.Mock;
		runTransaction.mockImplementation(
			async (callback: (value: typeof transaction) => Promise<unknown>) =>
				callback(transaction),
		);

		const threadId = await RunServices.startPersistedRun({
			runId: "run_2",
			organizationId: "org_1",
			memberId: "member_1",
			request: {
				input: "Create an order",
				context: {
					current_page: "/orders",
					timezone: "UTC",
					localDatetime: "2026-08-19T15:00:00Z",
				},
			},
		});

		expect(threadId).toBe("thread_2");
		expect(transaction.aiThread.updateMany).toHaveBeenCalledWith({
			where: {
				organizationId: "org_1",
				memberId: "member_1",
				feature: "quick_catcher",
				status: "ACTIVE",
			},
			data: { status: "ARCHIVED" },
		});
		expect(transaction.aiThread.create).toHaveBeenCalled();
	});
});