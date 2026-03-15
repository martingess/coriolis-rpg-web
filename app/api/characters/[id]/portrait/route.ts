import { extname } from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { updatePortraitPath } from "@/lib/roster";

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
  const portrait = await prisma.characterPortrait.findUnique({
    where: {
      characterId: id,
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
  const { id } = await context.params;
  const existing = await prisma.character.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
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
  const portraitPath = `/api/characters/${id}/portrait?v=${Date.now()}`;

  await prisma.characterPortrait.upsert({
    where: {
      characterId: id,
    },
    create: {
      characterId: id,
      data,
      mimeType,
    },
    update: {
      data,
      mimeType,
    },
  });

  const character = await updatePortraitPath(id, portraitPath);

  return NextResponse.json({ character });
}
