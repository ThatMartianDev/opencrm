import { slugify } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { createQueryContext } from "@/lib/dal/scoped-query";

describe("slugify", () => {
  test("converts a normal string to a slug", () => {
    expect(slugify("My Workspace")).toBe("my-workspace");
  });

  test("trims whitespace", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });

  test("replaces special characters with dashes", () => {
    expect(slugify("hello@world! #2026")).toBe("hello-world-2026");
  });

  test("collapses multiple dashes into one", () => {
    expect(slugify("too---many---dashes")).toBe("too-many-dashes");
  });

  test("removes leading and trailing dashes", () => {
    expect(slugify("--no-edge-dashes--")).toBe("no-edge-dashes");
  });

  test("returns 'workspace' for empty string", () => {
    expect(slugify("")).toBe("workspace");
  });

  test("returns 'workspace' for whitespace-only string", () => {
    expect(slugify("   ")).toBe("workspace");
  });

  test("returns 'workspace' for special-chars-only string", () => {
    expect(slugify("@#$%^&*")).toBe("workspace");
  });

  test("truncates to 64 characters max", () => {
    const longString = "a".repeat(100);
    expect(slugify(longString).length).toBeLessThanOrEqual(64);
  });

  test("handles already-valid slugs", () => {
    expect(slugify("already-a-slug")).toBe("already-a-slug");
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("allows first request", () => {
    const result = rateLimit("test-key-1", 3, 10_000);
    expect(result).toEqual({ success: true });
  });

  test("allows requests within limit", () => {
    const key = "test-key-2";
    rateLimit(key, 3, 10_000);
    rateLimit(key, 3, 10_000);
    const result = rateLimit(key, 3, 10_000);
    expect(result).toEqual({ success: true });
  });

  test("blocks when limit exceeded", () => {
    const key = "test-key-3";
    rateLimit(key, 2, 10_000);
    rateLimit(key, 2, 10_000);
    const result = rateLimit(key, 2, 10_000);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(10_000);
    }
  });

  test("resets after window expires", () => {
    const key = "test-key-4";
    rateLimit(key, 1, 5_000);
    expect(rateLimit(key, 1, 5_000).success).toBe(false);
    jest.advanceTimersByTime(5_001);
    expect(rateLimit(key, 1, 5_000)).toEqual({ success: true });
  });
});

describe("createQueryContext", () => {
    test("createQueryContext returns correct permissions for OWNER role", () => {
        const ctx = createQueryContext({ organizationId: "org1", memberId: "member1", userId:"user1", role: "OWNER" });
        expect(ctx.can("deals.read")).toBe(true);
        expect(ctx.can("members.invite")).toBe(true);
        expect(ctx.can("workspace.manage")).toBe(true);
    });

    test("createQueryContext returns correct permissions for ADMIN role", () => {
        const ctx = createQueryContext({ organizationId: "org1", memberId: "member1", userId:"user1", role: "ADMIN" });
        expect(ctx.can("deals.read")).toBe(true);
        expect(ctx.can("members.invite")).toBe(true);
        expect(ctx.can("workspace.manage")).toBe(false);
    });

    test("createQueryContext returns correct permissions for MEMBER role", () => {
        const ctx = createQueryContext({ organizationId: "org1", memberId: "member2", userId:"user2", role: "MEMBER" });
        expect(ctx.can("deals.read")).toBe(true);
        expect(ctx.can("members.invite")).toBe(false);
        expect(ctx.can("workspace.manage")).toBe(false);
    });

    test("assertCan throws error when permission is missing", () => {
        const ctx = createQueryContext({ organizationId: "org1", memberId: "member2", userId:"user2", role: "MEMBER" });
        expect(() => ctx.assertCan("members.invite")).toThrow("Forbidden: requires \"members.invite\"");
    });

    test("assertCan does not throw error when permission is present", () => {
        const ctx = createQueryContext({ organizationId: "org1", memberId: "member1", userId:"user1", role: "OWNER" });
        expect(() => ctx.assertCan("members.invite")).not.toThrow();
    });
});