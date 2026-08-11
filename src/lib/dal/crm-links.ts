import "server-only";

import { prisma } from "@/lib/db/client";

export type CrmEntityLinks = {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  recordId?: string | null;
};

export async function assertCrmLinksBelongToOrganization(
  organizationId: string,
  links: CrmEntityLinks,
  options: { includeDeleted?: boolean } = {},
) {
  const activeFilter = options.includeDeleted ? {} : { deletedAt: null };
  const checks = [
    links.dealId
      ? prisma.deal.findFirst({
          where: { id: links.dealId, organizationId, ...activeFilter },
          select: { id: true },
        })
      : null,
    links.contactId
      ? prisma.contact.findFirst({
          where: { id: links.contactId, organizationId, ...activeFilter },
          select: { id: true },
        })
      : null,
    links.companyId
      ? prisma.company.findFirst({
          where: { id: links.companyId, organizationId, ...activeFilter },
          select: { id: true },
        })
      : null,
    links.recordId
      ? prisma.recordItem.findFirst({
          where: {
            id: links.recordId,
            organizationId,
            ...(options.includeDeleted ? {} : { archivedAt: null }),
          },
          select: { id: true },
        })
      : null,
  ];

  const results = await Promise.all(checks);
  if (results.some((result, index) => checks[index] !== null && result === null)) {
    throw new Error("CRM link target not found in this organization.");
  }
}

export async function assertMemberBelongsToOrganization(
  organizationId: string,
  memberId: string | null | undefined,
) {
  if (!memberId) return;

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId },
    select: { id: true },
  });
  if (!member) throw new Error("Member not found in this organization.");
}