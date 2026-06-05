import { NextRequest, NextResponse } from "next/server";
import { getSessionClaims } from "@/lib/auth/session";
import { getSupabaseAdmin, AVATARS_BUCKET } from "@/lib/supabase/client";
import { prisma } from "@/lib/db/client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionClaims();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, and WebP images are allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const storagePath = `users/${session.userId}/avatar.${ext}`;

    const { error: uploadError } = await getSupabaseAdmin().storage
      .from(AVATARS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATARS_BUCKET}/${storagePath}?v=${Date.now()}`;

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: publicUrl },
    });

    return NextResponse.json({ avatarUrl: publicUrl }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    if (message === "Not authenticated" || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
