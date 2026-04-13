import { extname } from "node:path";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logMutation } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { updateKnownFacePortraitPath } from "@/lib/team";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

function getNormalizedImageType(file: File) {
  const extension =
    allowedMimeTypes.get(file.type) ?? extname(file.name).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const portrait = await prisma.teamKnownFacePortrait.findUnique({
    where: {
      knownFaceId: id,
    },
    select: {
      data: true,
      mimeType: true,
    },
  });

  if (!portrait) {
    return new NextResponse("Portrait not found.", { status: 404 });
  }

  return new NextResponse(Buffer.from(portrait.data), {
    headers: {
      "cache-control": "no-store, max-age=0",
      "content-type": portrait.mimeType,
    },
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    await logMutation({
      action: "known-face.portrait.update.denied",
      actorUsername: "anonymous",
      entityType: "knownFace",
      metadata: { reason: "unauthenticated" },
      summary: "Blocked anonymous attempt to update a known-face portrait.",
      userId: null,
    });
    return NextResponse.json(
      {
        error: "Authentication required.",
      },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const existing = await prisma.teamKnownFace.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Known face not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Portrait file is required." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json(
      { error: "Portraits must be 5 MB or smaller." },
      { status: 400 },
    );
  }

  const mimeType = getNormalizedImageType(file);

  if (!mimeType) {
    return NextResponse.json(
      { error: "Only PNG, JPG, and WEBP portraits are supported." },
      { status: 400 },
    );
  }

  const data = Buffer.from(await file.arrayBuffer());
  const portraitPath = `/api/known-faces/${id}/portrait?v=${Date.now()}`;

  try {
    const team = await prisma.$transaction(async (tx) => {
      await tx.teamKnownFacePortrait.upsert({
        where: {
          knownFaceId: id,
        },
        create: {
          knownFaceId: id,
          data,
          mimeType,
        },
        update: {
          data,
          mimeType,
        },
      });

      const updatedTeam = await updateKnownFacePortraitPath(id, portraitPath, tx);
      await logMutation({
        action: "known-face.portrait.update",
        db: tx,
        entityId: id,
        entityType: "knownFace",
        metadata: { knownFaceId: id, mimeType },
        summary: `Updated portrait for known face ${id}.`,
        userId: user.id,
      });

      return updatedTeam;
    });

    return NextResponse.json({ team });
  } catch (error) {
    await logMutation({
      action: "known-face.portrait.update.failed",
      actorUsername: user.username,
      entityId: id,
      entityType: "knownFace",
      metadata: {
        error: error instanceof Error ? error.message : "unknown-error",
        knownFaceId: id,
      },
      summary: `Failed to update portrait for known face ${id}.`,
      userId: user.id,
    });
    throw error;
  }
}
