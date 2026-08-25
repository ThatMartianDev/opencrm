/** @jest-environment node */

import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

describe("proxy internal AI tools", () => {
  test.each([
    "/api/internal/ai/tools/search-records",
    "/api/internal/ai/tools/get-linked-records",
  ])("allows bearer-authenticated tool route %s without a session cookie", async (path) => {
    const response = await proxy(new NextRequest(`http://localhost${path}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});