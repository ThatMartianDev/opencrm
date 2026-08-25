/** @jest-environment node */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { verifyCatcherToolGrant } from "@/modules/ai/tool-grant";
import { POST } from "@/app/api/internal/ai/tools/get-linked-records/route";

jest.mock("@/lib/db/client", () => ({
  prisma: {
    member: { findFirst: jest.fn() },
    aiRun: { findFirst: jest.fn() },
    recordItem: { findFirst: jest.fn() },
    recordRelationship: { findMany: jest.fn() },
  },
}));

jest.mock("@/lib/dal/scoped-query", () => ({
  createQueryContext: jest.fn(),
}));

jest.mock("@/modules/ai/tool-grant", () => ({
  verifyCatcherToolGrant: jest.fn(),
}));

const mockPrisma = jest.mocked(prisma);
const mockCreateQueryContext = jest.mocked(createQueryContext);
const mockVerifyGrant = jest.mocked(verifyCatcherToolGrant);

function request(body: unknown) {
  return new NextRequest("http://localhost/api/internal/ai/tools/get-linked-records", {
    method: "POST",
    headers: {
      authorization: "Bearer tool-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const person = {
  id: "record_person",
  moduleId: "module_people",
  displayName: "Maged Ahmed",
  module: { key: "people", name: "People" },
  values: [],
};

const quote = {
  id: "record_quote",
  moduleId: "module_quotes",
  displayName: "Office Desktop Quote",
  module: { key: "quotes", name: "Quotes" },
  values: [
    {
      value: "Negotiation",
      field: { label: "Stage", isPrimary: false, position: 1 },
    },
  ],
};

const company = {
  id: "record_company",
  moduleId: "module_companies",
  displayName: "Acme Office",
  module: { key: "companies", name: "Companies" },
  values: [],
};

describe("get linked records tool route", () => {
  beforeEach(() => {
    mockVerifyGrant.mockResolvedValue({
      runId: "run_1",
      userId: "user_1",
      memberId: "member_1",
      organizationId: "org_1",
      tools: ["get_linked_records"],
    });
    mockCreateQueryContext.mockReturnValue({
      assertCan: jest.fn(),
    } as never);
    mockPrisma.member.findFirst.mockResolvedValue({
      id: "member_1",
      userId: "user_1",
      organizationId: "org_1",
      role: "ADMIN",
      permissions: [],
    } as never);
    mockPrisma.aiRun.findFirst.mockResolvedValue({ id: "run_1" } as never);
    mockPrisma.recordItem.findFirst.mockResolvedValue({
      id: person.id,
      displayName: person.displayName,
    } as never);
  });

  test("rejects a token without linked-record access", async () => {
    mockVerifyGrant.mockResolvedValue(null);

    const response = await POST(request({ recordId: person.id, query: "quote", limit: 10 }));

    expect(response.status).toBe(401);
    expect(mockPrisma.recordRelationship.findMany).not.toHaveBeenCalled();
  });

});
