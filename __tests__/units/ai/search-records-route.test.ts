/** @jest-environment node */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { verifyCatcherToolGrant } from "@/modules/ai/tool-grant";
import RecordModuleService from "@/modules/RecordModule/service";
import { POST } from "@/app/api/internal/ai/tools/search-records/route";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    member: { findFirst: jest.fn() },
    aiRun: { findFirst: jest.fn() },
    recordModule: { findMany: jest.fn() },
  },
}));

jest.mock("@/lib/dal/scoped-query", () => ({
  createQueryContext: jest.fn(),
}));

jest.mock("@/modules/ai/tool-grant", () => ({
  verifyCatcherToolGrant: jest.fn(),
}));

jest.mock("@/modules/RecordModule/service", () => ({
  __esModule: true,
  default: { searchAllRecords: jest.fn() },
}));

const mockPrisma = jest.mocked(prisma);
const mockCreateQueryContext = jest.mocked(createQueryContext);
const mockVerifyGrant = jest.mocked(verifyCatcherToolGrant);
const mockSearchRecords = jest.mocked(RecordModuleService.searchAllRecords);

function request(body: unknown) {
  return new NextRequest("http://localhost/api/internal/ai/tools/search-records", {
    method: "POST",
    headers: {
      authorization: "Bearer tool-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("search records tool route", () => {
  beforeEach(() => {
    mockVerifyGrant.mockResolvedValue({
      runId: "run_1",
      userId: "user_1",
      memberId: "member_1",
      organizationId: "org_1",
      tools: ["search_records"],
    });
    mockCreateQueryContext.mockReturnValue({ assertCan: jest.fn() } as never);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "member_1",
      userId: "user_1",
      organizationId: "org_1",
      role: "ADMIN",
      permissions: [],
    } as never);
    mockPrisma.aiRun.findFirst.mockResolvedValue({ id: "run_1" } as never);
    mockPrisma.recordModule.findMany.mockResolvedValue([
      { id: "module_companies", key: "companies", name: "Companies" },
      { id: "module_people", key: "people", name: "People" },
      { id: "module_projects", key: "projects", name: "Projects" },
    ] as never);
    mockSearchRecords.mockResolvedValue([]);
  });

  test("accepts module hints but searches modules in neutral workspace order", async () => {
    const response = await POST(request({
      moduleIds: ["module_people"],
      query: "Ahmed",
      limit: 5,
    }));

    expect(response.status).toBe(200);
    expect(mockSearchRecords.mock.calls.map(([input]) => input.moduleId)).toEqual([
      "module_companies",
      "module_people",
      "module_projects",
    ]);
  });

  test("does not use model module hints to break equal-score ties", async () => {
    mockSearchRecords.mockImplementation(async ({ moduleId }) => [
      {
        id: `${moduleId}_annabelle`,
        moduleId,
        displayName: "Annabelle",
        score: 1,
        matchReason: "exact_name",
        matchedFields: ["Name"],
        summary: [],
      },
    ]);

    const response = await POST(request({
      moduleIds: ["module_people"],
      query: "Annabelle",
      limit: 5,
    }));
    const body = await response.json();

    expect(body.candidates.map((candidate: { moduleId: string }) => candidate.moduleId)).toEqual([
      "module_companies",
      "module_people",
      "module_projects",
    ]);
  });

  test("rejects an unavailable prioritized module", async () => {
    const response = await POST(request({
      moduleIds: ["module_missing"],
      query: "Ahmed",
      limit: 5,
    }));

    expect(response.status).toBe(404);
    expect(mockSearchRecords).not.toHaveBeenCalled();
  });

  test("globally ranks stronger matches ahead of module priority", async () => {
    mockSearchRecords.mockImplementation(async ({ moduleId }) => moduleId === "module_people"
      ? [{
          id: "person_1",
          moduleId,
          displayName: "Ahmed Ibrahim",
          score: 0.9,
          matchReason: "name_prefix",
          matchedFields: ["Name"],
          summary: [],
        }]
      : moduleId === "module_companies"
        ? [{
            id: "company_1",
            moduleId,
            displayName: "Ahmed",
            score: 1,
            matchReason: "exact_name",
            matchedFields: ["Company Name"],
            summary: [],
          }]
        : []);

    const response = await POST(request({
      moduleIds: ["module_people"],
      query: "Ahmed",
      limit: 5,
    }));
    const body = await response.json();

    expect(body.candidates.map((candidate: { id: string }) => candidate.id)).toEqual([
      "company_1",
      "person_1",
    ]);
    expect(body.candidates[0]).toEqual(expect.objectContaining({
      score: 1,
      matchReason: "exact_name",
      matchedFields: ["Company Name"],
    }));
  });
});