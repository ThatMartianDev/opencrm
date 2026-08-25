import { NextRequest, NextResponse } from "next/server";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { searchRecordsToolSchema } from "@/modules/ai/features/catcher/schemas";
import { verifyCatcherToolGrant } from "@/modules/ai/tool-grant";
import RecordModuleService from "@/modules/RecordModule/service";
import { prisma } from "@/lib/db/client";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  const grant = token ? await verifyCatcherToolGrant(token) : null;
  if (!grant || !grant.tools.includes("search_records")) {
    return NextResponse.json({ error: "Invalid tool grant." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = searchRecordsToolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid search request." },
      { status: 400 },
    );
  }

  const [member, run] = await Promise.all([
    prisma.member.findFirst({
      where: {
        id: grant.memberId,
        userId: grant.userId,
        organizationId: grant.organizationId,
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
        permissions: true,
      },
    }),
    prisma.aiRun.findFirst({
      where: {
        id: grant.runId,
        status: "RUNNING",
        thread: {
          memberId: grant.memberId,
          organizationId: grant.organizationId,
        },
      },
      select: { id: true },
    }),
  ]);
  if (!member || !run) {
    return NextResponse.json({ error: "Tool grant is no longer active." }, { status: 401 });
  }

  try {
    createQueryContext({
      userId: member.userId,
      memberId: member.id,
      organizationId: member.organizationId,
      role: member.role,
      permissions: member.permissions,
    }).assertCan("records.read");
  } catch {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const availableModules = await prisma.recordModule.findMany({
    where: {
      organizationId: member.organizationId,
      archivedAt: null,
    },
    select: { id: true, key: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  const availableModuleIds = new Set(availableModules.map((module) => module.id));
  if (parsed.data.moduleIds.some((moduleId) => !availableModuleIds.has(moduleId))) {
    return NextResponse.json({ error: "One or more modules were not found." }, { status: 404 });
  }

  const results = await Promise.all(
    availableModules.map(async (module) => ({
      module,
      candidates: await RecordModuleService.searchAllRecords({
        organizationId: member.organizationId,
        moduleId: module.id,
        query: parsed.data.query,
        limit: parsed.data.limit,
      }),
    })),
  );
  const moduleOrder = new Map(
    availableModules.map((module, index) => [module.id, index]),
  );
  const candidates = results
    .flatMap(({ module, candidates }) =>
      (candidates ?? []).map((candidate) => ({
        ...candidate,
        moduleKey: module.key,
        moduleName: module.name,
      })),
    )
    .sort((left, right) => {
      return right.score - left.score
        || (moduleOrder.get(left.moduleId) ?? Number.MAX_SAFE_INTEGER)
          - (moduleOrder.get(right.moduleId) ?? Number.MAX_SAFE_INTEGER)
        || left.displayName.localeCompare(right.displayName);
    })
    .slice(0, parsed.data.limit);

  return NextResponse.json({ runId: grant.runId, candidates });
}
