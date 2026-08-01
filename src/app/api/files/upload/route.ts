import { NextRequest, NextResponse } from "next/server";
import { getSessionClaims } from "@/lib/auth/session";
import { createQueryContext } from "@/lib/dal/scoped-query";
import { FilesService } from "@/modules/files/service";
import { prisma } from "@/lib/db/client";
import { ModuleFeature } from "@/generated/prisma/enums";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionClaims();
    const ctx = createQueryContext(session);
    ctx.assertCan("files.create");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parentId = formData.get("parentId") as string | null;
    const dealId = formData.get("dealId") as string | null;
    const contactId = formData.get("contactId") as string | null;
    const companyId = formData.get("companyId") as string | null;
    const recordId = formData.get("recordId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (50MB max)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    // Verify parentId belongs to user's organization
    if (parentId) {
      const parentFolder = await prisma.file.findFirst({
        where: { id: parentId, organizationId: session.organizationId },
      });
      if (!parentFolder) {
        return NextResponse.json({ error: "Invalid parent folder" }, { status: 403 });
      }
    }

    // Verify entity belongs to user's organization
    if (dealId) {
      const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId: session.organizationId } });
      if (!deal) return NextResponse.json({ error: "Invalid deal" }, { status: 403 });
    }
    if (contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: contactId, organizationId: session.organizationId } });
      if (!contact) return NextResponse.json({ error: "Invalid contact" }, { status: 403 });
    }
    if (companyId) {
      const company = await prisma.company.findFirst({ where: { id: companyId, organizationId: session.organizationId } });
      if (!company) return NextResponse.json({ error: "Invalid company" }, { status: 403 });
    }
    if (recordId) {
      const record = await prisma.recordItem.findFirst({
        where: {
          id: recordId,
          organizationId: session.organizationId,
          archivedAt: null,
          module: {
            archivedAt: null,
            features: { has: ModuleFeature.FILES },
          },
        },
        select: { id: true },
      });
      if (!record) {
        return NextResponse.json(
          { error: "Invalid record or files are not enabled" },
          { status: 403 },
        );
      }
    }

    const scope = {
      dealId: dealId || undefined,
      contactId: contactId || undefined,
      companyId: companyId || undefined,
      recordId: recordId || undefined,
    };

    const record = await FilesService.uploadFile(
      session.organizationId,
      session.memberId,
      file,
      scope,
      parentId,
    );

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    if (message === "Not authenticated" || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
