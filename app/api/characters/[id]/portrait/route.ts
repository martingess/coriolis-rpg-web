import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { updatePortraitPath } from "@/lib/roster";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
]);

function isManagedPortrait(pathname: string | null) {
  return Boolean(pathname && pathname.startsWith("/uploads/portraits/"));
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
      portraitPath: true,
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

  const extension =
    allowedMimeTypes.get(file.type) ?? extname(file.name).toLowerCase();

  if (![".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
    return NextResponse.json(
      { error: "Only PNG, JPG, and WEBP portraits are supported." },
      { status: 400 },
    );
  }

  const uploadDir = resolve(process.cwd(), "public/uploads/portraits");
  await mkdir(uploadDir, { recursive: true });

  const normalizedExtension = extension === ".jpeg" ? ".jpg" : extension;
  const fileName = `${id}-${randomUUID()}${normalizedExtension}`;
  const destination = resolve(uploadDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(destination, bytes);

  if (isManagedPortrait(existing.portraitPath)) {
    const previousFile = resolve(
      process.cwd(),
      `public${existing.portraitPath}`,
    );
    await rm(previousFile, { force: true });
  }

  const character = await updatePortraitPath(id, `/uploads/portraits/${fileName}`);

  return NextResponse.json({ character });
}
