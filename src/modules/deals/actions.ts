"use server";

import { DealsService } from "./service";
import { DealStage } from "@/generated/prisma/enums";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";

export const getDeals = async () => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("deals.read");

  const deals = await DealsService.getAllDeals(session.organizationId);
  return deals.map((d) => ({
    ...d,
    value: d.value != null ? Number(d.value) : null,
  }));
};

export const getDealById = async (dealId: string) => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("deals.read");

  const deal = await DealsService.getDealById(dealId, session.organizationId);
  if (!deal) return null;
  return { ...deal, value: deal.value != null ? Number(deal.value) : null };
};

export const createDeal = async (data: {
  title: string;
  stage: DealStage;
  status?: string;
  contactId?: string;
  companyId?: string;
  assignedToId?: string;
  value?: number;
  source?: string;
}) => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("deals.create");

  return DealsService.createDeal({ ...data, organizationId: session.organizationId }, session.memberId);
};

export const updateDealStage = async (dealId: string, newStage: DealStage) => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("deals.update");

  return DealsService.updateDealStage(
    dealId,
    newStage,
    session.organizationId,
    session.memberId,
  );
};

export const updateDealStatus = async (dealId: string, newStatus: string) => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("deals.update");

  return DealsService.updateDealStatus(
    dealId,
    newStatus,
    session.organizationId,
    session.memberId,
  );
};

export const assignDeal = async (
  dealId: string,
  assignedToId: string,
  assignedToName: string,
) => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("deals.update");

  return DealsService.assignDeal(
    dealId,
    assignedToId,
    assignedToName,
    session.organizationId,
    session.memberId,
  );
};

export const updateDealField = async (
  dealId: string,
  field: "title" | "value" | "source" | "lostReason",
  value: string,
) => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("deals.update");

  return DealsService.updateDealField(
    dealId,
    field,
    value,
    session.organizationId,
    session.memberId,
  );
};

export const updateDealRelation = async (
  dealId: string,
  field: "contactId" | "companyId",
  value: string | null,
  entityName: string,
) => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);
  ctx.assertCan("deals.update");

  return DealsService.updateDealRelation(
    dealId,
    field,
    value,
    entityName,
    session.organizationId,
    session.memberId,
  );
};

export const deleteDeal = async (dealId: string) => {
  const session = await getSessionClaims();
  const ctx = createQueryContext(session);

  const canDeleteAny = ctx.can("deals.delete.any");
  if (!canDeleteAny) ctx.assertCan("deals.delete.own");

  return DealsService.deleteDeal({
    dealId,
    organizationId: session.organizationId,
    memberId: session.memberId,
    canDeleteAny,
  });
};
