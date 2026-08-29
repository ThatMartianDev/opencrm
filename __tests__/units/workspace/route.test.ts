import {
  getCanonicalWorkspacePath,
  matchesWorkspaceRoute,
} from "@/modules/workspace/workspace-url";

describe("matchesWorkspaceRoute", () => {
  test("accepts the current workspace slug", () => {
    expect(matchesWorkspaceRoute("acme-sales", "org_1", "acme-sales")).toBe(true);
  });

  test("accepts the legacy organization ID for existing deep links", () => {
    expect(matchesWorkspaceRoute("org_1", "org_1", "acme-sales")).toBe(true);
  });

  test("rejects another workspace slug", () => {
    expect(matchesWorkspaceRoute("other-workspace", "org_1", "acme-sales")).toBe(false);
  });
});

describe("getCanonicalWorkspacePath", () => {
  test("preserves the deep path while replacing a legacy organization ID", () => {
    expect(
      getCanonicalWorkspacePath(
        "/app/org_1/contacts/contact_1",
        "org_1",
        "acme-sales",
      ),
    ).toBe("/app/acme-sales/contacts/contact_1");
  });

  test("does not rewrite an already canonical slug URL", () => {
    expect(
      getCanonicalWorkspacePath("/app/acme-sales/home", "org_1", "acme-sales"),
    ).toBeNull();
  });
});