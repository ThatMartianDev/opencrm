import {
  clearWorkspaceCreationSession,
  clearWorkspaceSelectionSession,
  createSession,
  createWorkspaceCreationSession,
  createWorkspaceSelectionSession,
  getSessionClaims,
  getWorkspaceCreationUserId,
  getWorkspaceSelectionUserId,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  login,
  selectWorkspaceAfterLogin,
  setupWorkspace,
} from "@/modules/auth/actions";
import { AuthService } from "@/modules/auth/service";
import { rateLimit } from "@/lib/rate-limit";
import { redirect } from "next/navigation";

jest.mock("@/lib/auth/session", () => ({
  clearSession: jest.fn(),
  clearWorkspaceCreationSession: jest.fn(),
  clearWorkspaceSelectionSession: jest.fn(),
  createSession: jest.fn(),
  createWorkspaceCreationSession: jest.fn(),
  createWorkspaceSelectionSession: jest.fn(),
  getSessionClaims: jest.fn(),
  getWorkspaceCreationUserId: jest.fn(),
  getWorkspaceSelectionUserId: jest.fn(),
}));
jest.mock("@/lib/db/client", () => ({
  prisma: {
    member: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/modules/auth/service", () => ({
  AuthService: { login: jest.fn() },
}));
jest.mock("@/lib/auth", () => ({ hash: jest.fn() }));
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(),
  templates: {},
}));
jest.mock("@/lib/rate-limit", () => ({ rateLimit: jest.fn() }));
jest.mock("jose", () => ({ SignJWT: jest.fn(), jwtVerify: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    delete: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  }),
}));

const mockClearSelection = jest.mocked(clearWorkspaceSelectionSession);
const mockClearCreation = jest.mocked(clearWorkspaceCreationSession);
const mockCreateSession = jest.mocked(createSession);
const mockCreateCreation = jest.mocked(createWorkspaceCreationSession);
const mockCreateSelection = jest.mocked(createWorkspaceSelectionSession);
const mockGetSelectionUserId = jest.mocked(getWorkspaceSelectionUserId);
const mockGetCreationUserId = jest.mocked(getWorkspaceCreationUserId);
const mockGetSessionClaims = jest.mocked(getSessionClaims);
const mockMember = jest.mocked(prisma.member);
const mockOrganization = jest.mocked(prisma.organization);
const mockTransaction = jest.mocked(prisma.$transaction);
const mockLogin = jest.mocked(AuthService.login);
const mockRateLimit = jest.mocked(rateLimit);
const mockRedirect = jest.mocked(redirect);

function loginFormData() {
  const formData = new FormData();
  formData.set("email", "user@example.com");
  formData.set("password", "secret1");
  return formData;
}

describe("setupWorkspace", () => {
  test("creates and activates a workspace for the authenticated user", async () => {
    const transaction = {
      organization: {
        create: jest.fn().mockResolvedValue({
          id: "org_new",
          slug: "second-workspace",
        }),
      },
      member: {
        create: jest.fn().mockResolvedValue({ id: "member_new", role: "OWNER" }),
      },
      user: { update: jest.fn().mockResolvedValue({}) },
    };
    mockGetSessionClaims.mockResolvedValue({ userId: "user_1" } as never);
    mockOrganization.findUnique.mockResolvedValue(null);
    mockRateLimit.mockReturnValue({ success: true });
    mockTransaction.mockImplementation(async (operation) => operation(transaction as never));

    await expect(
      setupWorkspace({ name: "Second Workspace", slug: "Second Workspace" }),
    ).resolves.toEqual({
      success: true,
      organizationId: "org_new",
      workspaceSlug: "second-workspace",
    });

    expect(transaction.organization.create).toHaveBeenCalledWith({
      data: { name: "Second Workspace", slug: "second-workspace" },
    });
    expect(transaction.member.create).toHaveBeenCalledWith({
      data: { userId: "user_1", organizationId: "org_new", role: "OWNER" },
    });
    expect(mockCreateSession).toHaveBeenCalledWith({
      userId: "user_1",
      memberId: "member_new",
      organizationId: "org_new",
      role: "OWNER",
    });
    expect(mockClearCreation).toHaveBeenCalled();
    expect(mockGetCreationUserId).not.toHaveBeenCalled();
  });
});

describe("login workspace selection", () => {
  beforeEach(() => {
    mockRateLimit.mockReturnValue({ success: true } as never);
  });

  test("routes an account with no memberships to workspace creation", async () => {
    mockLogin.mockResolvedValue({
      user: { id: "user_1" },
      memberships: [],
    } as never);

    await login(null, loginFormData());

    expect(mockCreateCreation).toHaveBeenCalledWith("user_1");
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/create-workspace");
  });

  test("creates a tenant session directly for one membership", async () => {
    mockLogin.mockResolvedValue({
      user: { id: "user_1" },
      memberships: [
        {
          id: "member_1",
          organizationId: "org_1",
          role: "OWNER",
          organization: { slug: "workspace-one" },
        },
      ],
    } as never);

    await login(null, loginFormData());

    expect(mockCreateSession).toHaveBeenCalledWith({
      userId: "user_1",
      memberId: "member_1",
      organizationId: "org_1",
      role: "OWNER",
    });
    expect(mockClearSelection).toHaveBeenCalled();
    expect(mockCreateSelection).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/app/workspace-one/home");
  });

  test("creates only a selection ticket for multiple memberships", async () => {
    mockLogin.mockResolvedValue({
      user: { id: "user_1" },
      memberships: [
        {
          id: "member_1",
          organizationId: "org_1",
          role: "OWNER",
          organization: { slug: "workspace-one" },
        },
        {
          id: "member_2",
          organizationId: "org_2",
          role: "MEMBER",
          organization: { slug: "workspace-two" },
        },
      ],
    } as never);

    await login(null, loginFormData());

    expect(mockCreateSelection).toHaveBeenCalledWith("user_1");
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/select-workspace");
  });
});

describe("selectWorkspaceAfterLogin", () => {
  beforeEach(() => {
    mockGetSelectionUserId.mockResolvedValue("user_1");
  });

  test("exchanges the ticket for server-derived membership claims", async () => {
    mockMember.findUnique.mockResolvedValue({
      id: "member_2",
      organizationId: "org_2",
      role: "ADMIN",
      organization: { slug: "workspace-two" },
    } as never);

    await expect(selectWorkspaceAfterLogin("org_2")).resolves.toEqual({
      organizationId: "org_2",
      workspaceSlug: "workspace-two",
    });

    expect(mockMember.findUnique).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId: "user_1",
          organizationId: "org_2",
        },
      },
      select: {
        id: true,
        organizationId: true,
        role: true,
        organization: { select: { slug: true } },
      },
    });
    expect(mockCreateSession).toHaveBeenCalledWith({
      userId: "user_1",
      memberId: "member_2",
      organizationId: "org_2",
      role: "ADMIN",
    });
    expect(mockClearSelection).toHaveBeenCalled();
  });

  test("does not exchange a ticket for an inaccessible workspace", async () => {
    mockMember.findUnique.mockResolvedValue(null);

    await expect(selectWorkspaceAfterLogin("org_other")).rejects.toThrow(
      "Workspace access denied",
    );
    expect(mockCreateSession).not.toHaveBeenCalled();
    expect(mockClearSelection).not.toHaveBeenCalled();
  });
});