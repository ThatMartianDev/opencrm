/** @jest-environment node */

import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config, proxy } from "@/proxy";
import { jwtVerify } from "jose";

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
}));

const mockJwtVerify = jest.mocked(jwtVerify);

describe("proxy route protection", () => {
  test.each([
    "/",
    "/feedback",
    "/legal/privacy-policy",
    "/login",
    "/register",
    "/api/auth/google",
    "/api/internal/ai/tools/search-records",
  ])("does not run for public route %s", (path) => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: `http://localhost${path}`,
      }),
    ).toBe(false);
  });

  test.each(["/app", "/app/acme", "/app/acme/home"])(
    "runs for protected route %s",
    (path) => {
      expect(
        unstable_doesMiddlewareMatch({
          config,
          nextConfig: {},
          url: `http://localhost${path}`,
        }),
      ).toBe(true);
    },
  );

  test.each([
    "/",
    "/feedback",
    "/legal/privacy-policy",
    "/login",
    "/register",
    "/api/auth/google",
    "/api/internal/ai/tools/search-records",
    "/api/internal/ai/tools/get-linked-records",
  ])("allows public route %s without a session cookie", async (path) => {
    const response = await proxy(new NextRequest(`http://localhost${path}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  test("redirects an unauthenticated app request to login", async () => {
    const response = await proxy(
      new NextRequest("http://localhost/app/acme/home"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?next=%2Fapp%2Facme%2Fhome",
    );
  });

  test("allows an app request with a valid session", async () => {
    process.env.AUTH_SECRET = "test-secret";
    mockJwtVerify.mockResolvedValue({ payload: {}, protectedHeader: {} } as never);
    const request = new NextRequest("http://localhost/app/acme/home", {
      headers: { cookie: "session=valid-token" },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(mockJwtVerify).toHaveBeenCalledWith(
      "valid-token",
      expect.any(Uint8Array),
      { algorithms: ["HS256"] },
    );
  });
});