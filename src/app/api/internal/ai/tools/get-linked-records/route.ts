import { NextRequest, NextResponse } from "next/server";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { prisma } from "@/lib/db/client";
import { linkedRecordsToolSchema } from "@/modules/ai/features/catcher/schemas";
import { verifyCatcherToolGrant } from "@/modules/ai/tool-grant";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim();
}

function summarizeValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(String).join(", ");
  return null;
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  const grant = token ? await verifyCatcherToolGrant(token) : null;
  if (!grant || !grant.tools.includes("get_linked_records")) {
    return NextResponse.json({ error: "Invalid tool grant." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = linkedRecordsToolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid linked record request." },
      { status: 400 },
    );
  }

  const [member, run, sourceRecord] = await Promise.all([
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
    prisma.recordItem.findFirst({
      where: {
        id: parsed.data.recordId,
        organizationId: grant.organizationId,
        archivedAt: null,
        module: { archivedAt: null },
      },
      select: { id: true, displayName: true },
    }),
  ]);
  if (!member || !run) {
    return NextResponse.json({ error: "Tool grant is no longer active." }, { status: 401 });
  }
  if (!sourceRecord) {
    return NextResponse.json({ error: "Source record was not found." }, { status: 404 });
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

  const recordSelect = {
    id: true,
    moduleId: true,
    displayName: true,
    module: { select: { key: true, name: true } },
    values: {
      select: {
        value: true,
        field: { select: { label: true, isPrimary: true, position: true } },
      },
      orderBy: { field: { position: "asc" as const } },
    },
  };
  const relationships = await prisma.recordRelationship.findMany({
    where: {
      organizationId: member.organizationId,
      OR: [
        {
          sourceRecordId: sourceRecord.id,
          targetRecord: { archivedAt: null, module: { archivedAt: null } },
        },
        {
          targetRecordId: sourceRecord.id,
          sourceRecord: { archivedAt: null, module: { archivedAt: null } },
        },
      ],
    },
    select: {
      id: true,
      sourceRecordId: true,
      field: { select: { label: true } },
      sourceRecord: { select: recordSelect },
      targetRecord: { select: recordSelect },
    },
  });

  const linkedByRecordId = new Map<string, {
    id: string;
    moduleId: string;
    moduleKey: string;
    moduleName: string;
    displayName: string;
    direction: "incoming" | "outgoing";
    relationshipLabels: string[];
    summary: { label: string; value: string }[];
  }>();
  for (const relationship of relationships) {
    const outgoing = relationship.sourceRecordId === sourceRecord.id;
    const linked = outgoing ? relationship.targetRecord : relationship.sourceRecord;
    const existing = linkedByRecordId.get(linked.id);
    if (existing) {
      if (!existing.relationshipLabels.includes(relationship.field.label)) {
        existing.relationshipLabels.push(relationship.field.label);
      }
      continue;
    }

    linkedByRecordId.set(linked.id, {
      id: linked.id,
      moduleId: linked.moduleId,
      moduleKey: linked.module.key,
      moduleName: linked.module.name,
      displayName: linked.displayName,
      direction: outgoing ? "outgoing" : "incoming",
      relationshipLabels: [relationship.field.label],
      summary: linked.values.flatMap(({ field, value }) => {
        if (field.isPrimary) return [];
        const formatted = summarizeValue(value);
        return formatted ? [{ label: field.label, value: formatted }] : [];
      }).slice(0, 6),
    });
  }

  const normalizedQuery = parsed.data.query.toLocaleLowerCase();
  const linkedRecords = Array.from(linkedByRecordId.values())
    .map((record) => {
      if (!normalizedQuery) {
        return { ...record, score: 1, matchReason: "all_linked" as const };
      }
      const moduleName = record.moduleName.toLocaleLowerCase();
      const moduleKey = record.moduleKey.toLocaleLowerCase();
      const displayName = record.displayName.toLocaleLowerCase();
      const relationshipLabels = record.relationshipLabels.join(" ").toLocaleLowerCase();
      if (moduleName === normalizedQuery || moduleKey === normalizedQuery) {
        return { ...record, score: 1, matchReason: "exact_module" as const };
      }
      if (moduleName.includes(normalizedQuery) || moduleKey.includes(normalizedQuery)) {
        return { ...record, score: 0.9, matchReason: "module_contains" as const };
      }
      if (relationshipLabels.includes(normalizedQuery)) {
        return { ...record, score: 0.8, matchReason: "relationship_label" as const };
      }
      if (displayName.includes(normalizedQuery)) {
        return { ...record, score: 0.7, matchReason: "display_name" as const };
      }
      return { ...record, score: 0, matchReason: "none" as const };
    })
    .sort((left, right) => {
      return right.score - left.score
        || left.moduleName.localeCompare(right.moduleName)
        || left.displayName.localeCompare(right.displayName);
    })
    .slice(0, parsed.data.limit);

  return NextResponse.json({
    runId: grant.runId,
    sourceRecord,
    linkedRecords,
  });
}
