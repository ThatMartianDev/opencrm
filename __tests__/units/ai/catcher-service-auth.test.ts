/** @jest-environment node */

import { RunServices } from "@/modules/ai/features/catcher/services/run.service";
import type { CatcherRequest } from "@/modules/ai/features/catcher/types";

jest.mock("@/lib/db/client", () => ({ prisma: {} }));

const request: CatcherRequest = {
  input: "Create a task",
  user: { organizationId: "org_1", memberId: "member_1" },
  available_modules: [],
  tool_access: { token: "separate-tool-grant" },
  context: {
    current_page: "/tasks",
    timezone: "UTC",
    localDatetime: "2026-10-28T15:00:00Z",
  },
  history: [],
};

describe("catcher service authentication", () => {
  const originalUrl = process.env.AI_SERVICE_URL;
  const originalToken = process.env.AI_SERVICE_AUTH_TOKEN;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    process.env.AI_SERVICE_URL = "http://127.0.0.1:8000/";
    process.env.AI_SERVICE_AUTH_TOKEN = "test-service-token";
    fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        kind: "info", runId: "catch_test", message: "Authenticated",
      }), { status: 200 }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUrl === undefined) delete process.env.AI_SERVICE_URL;
    else process.env.AI_SERVICE_URL = originalUrl;
    if (originalToken === undefined) delete process.env.AI_SERVICE_AUTH_TOKEN;
    else process.env.AI_SERVICE_AUTH_TOKEN = originalToken;
  });

  test("sends a server-side bearer token without changing the tool grant", async () => {
    await expect(RunServices.createRun(request)).resolves.toEqual({
      kind: "info", runId: "catch_test", message: "Authenticated",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/catcher/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-service-token",
      },
      body: JSON.stringify(request),
    });
  });

  test.each([undefined, "", " \t\n"])(
    "rejects missing/blank service token %p without sending a request",
    async (token) => {
      if (token === undefined) delete process.env.AI_SERVICE_AUTH_TOKEN;
      else process.env.AI_SERVICE_AUTH_TOKEN = token;
      await expect(RunServices.createRun(request))
        .rejects.toThrow("AI_SERVICE_AUTH_TOKEN is not configured.");
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  test("preserves the missing URL error", async () => {
    delete process.env.AI_SERVICE_URL;
    await expect(RunServices.createRun(request))
      .rejects.toThrow("AI_SERVICE_URL is not configured.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("surfaces authentication rejection without returning a successful result", async () => {
    fetchMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    await expect(RunServices.createRun(request))
      .rejects.toThrow("AI catcher request failed with status 401.");
  });
});
