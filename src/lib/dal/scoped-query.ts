import "server-only";

import type { MemberRole } from "@/generated/prisma/enums";
import type { SessionClaims } from "@/lib/auth/types";

export type Resource =
  | "deals"
  | "contacts"
  | "companies"
  | "records"
  | "tasks"
  | "notes"
  | "files"
  | "members"
  | "workspace";

export type Action =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "invite"
  | "remove"
  | "manage";

export type Scope = "own" | "any";

export type Permission =
  | `${Resource}.${Action}`
  | `${Resource}.${Action}.${Scope}`;

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  OWNER: [
    "deals.read",
    "deals.create",
    "deals.update",
    "deals.delete.any",
    "deals.delete.own",
    "contacts.read",
    "contacts.create",
    "contacts.update",
    "contacts.delete.any",
    "contacts.delete.own",
    "companies.read",
    "companies.create",
    "companies.update",
    "companies.delete.any",
    "companies.delete.own",
    "records.read",
    "records.create",
    "records.update",
    "records.delete.any",
    "records.delete.own",
    "tasks.read",
    "tasks.create",
    "tasks.update",
    "tasks.delete.any",
    "tasks.delete.own",
    "notes.read",
    "notes.create",
    "notes.update",
    "notes.delete.any",
    "notes.delete.own",
    "files.read",
    "files.create",
    "files.update",
    "files.delete.any",
    "files.delete.own",
    "members.read",
    "members.invite",
    "members.remove",
    "workspace.manage",
  ],
  ADMIN: [
    "deals.read",
    "deals.create",
    "deals.update",
    "deals.delete.any",
    "deals.delete.own",
    "contacts.read",
    "contacts.create",
    "contacts.update",
    "contacts.delete.any",
    "contacts.delete.own",
    "companies.read",
    "companies.create",
    "companies.update",
    "companies.delete.any",
    "companies.delete.own",
    "records.read",
    "records.create",
    "records.update",
    "records.delete.any",
    "records.delete.own",
    "tasks.read",
    "tasks.create",
    "tasks.update",
    "tasks.delete.any",
    "tasks.delete.own",
    "notes.read",
    "notes.create",
    "notes.update",
    "notes.delete.any",
    "notes.delete.own",
    "files.read",
    "files.create",
    "files.update",
    "files.delete.any",
    "files.delete.own",
    "members.read",
    "members.invite",
    "members.remove",
  ],
  MANAGER: [
    "deals.read",
    "deals.create",
    "deals.update",
    "deals.delete.own",
    "contacts.read",
    "contacts.create",
    "contacts.update",
    "contacts.delete.own",
    "companies.read",
    "companies.create",
    "companies.update",
    "companies.delete.own",
    "records.read",
    "records.create",
    "records.update",
    "records.delete.own",
    "tasks.read",
    "tasks.create",
    "tasks.update",
    "tasks.delete.any",
    "tasks.delete.own",
    "notes.read",
    "notes.create",
    "notes.update",
    "notes.delete.own",
    "files.read",
    "files.create",
    "files.update",
    "files.delete.own",
    "members.read",
  ],
  MEMBER: [
    "deals.read",
    "deals.create",
    "deals.delete.own",
    "contacts.read",
    "contacts.create",
    "contacts.delete.own",
    "companies.read",
    "companies.delete.own",
    "records.read",
    "records.create",
    "records.delete.own",
    "tasks.read",
    "tasks.create",
    "tasks.update",
    "tasks.delete.own",
    "notes.read",
    "notes.create",
    "notes.delete.own",
    "files.read",
    "files.create",
    "files.delete.own",
    "members.read",
  ],
};

export type QueryContext = {
  orgId: string;
  memberId: string;
  role: MemberRole;
  assertCan: (permission: Permission) => void;
  can: (permission: Permission) => boolean;
};

export function createQueryContext(session: SessionClaims): QueryContext {
  const permissions = new Set(ROLE_PERMISSIONS[session.role]);

  function can(permission: Permission) {
    return permissions.has(permission);
  }

  function assertCan(permission: Permission): void {
    if (!can(permission)) {
      throw new Error(`Forbidden: requires "${permission}"`);
    }
  }

  return {
    orgId: session.organizationId,
    memberId: session.memberId,
    role: session.role,
    assertCan,
    can,
  };
}
