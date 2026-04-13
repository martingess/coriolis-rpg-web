import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditMetadata = Prisma.InputJsonValue | null | undefined;
type AuditClient = PrismaClient | Prisma.TransactionClient;
type SanitizedAuditMetadata =
  | Prisma.InputJsonObject
  | Prisma.InputJsonArray
  | string
  | number
  | boolean
  | null;

function sanitizeMetadataValue(
  value: AuditMetadata,
): SanitizedAuditMetadata | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item): Prisma.InputJsonValue | null => {
      const sanitized = sanitizeMetadataValue(item);
      return sanitized === undefined ? null : sanitized;
    });
  }

  const objectValue = value as Prisma.InputJsonObject;
  const sanitizedEntries = Object.entries(objectValue).flatMap(([key, entryValue]) => {
    const sanitized = sanitizeMetadataValue(entryValue as AuditMetadata);

    if (sanitized === undefined) {
      return [];
    }

    return [[key, sanitized] as const];
  });

  return Object.fromEntries(sanitizedEntries);
}

function serializeMetadata(
  value: AuditMetadata,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  const sanitized = sanitizeMetadataValue(value);

  if (sanitized === undefined) {
    return undefined;
  }

  if (sanitized === null) {
    return Prisma.JsonNull;
  }

  return sanitized;
}

export async function logMutation(input: {
  action: string;
  actorUsername?: string;
  db?: AuditClient;
  entityId?: string | null;
  entityType: string;
  metadata?: AuditMetadata;
  summary: string;
  userId?: string | null;
}) {
  const db = input.db ?? prisma;
  const actor =
    input.actorUsername ??
    (
      input.userId
        ? await db.user.findUnique({
            where: {
              id: input.userId,
            },
            select: {
              username: true,
            },
          })
        : null
    )?.username ??
    "unknown";

  return db.auditLog.create({
    data: {
      action: input.action,
      actorUsername: actor,
      entityId: input.entityId ?? null,
      entityType: input.entityType,
      metadata: serializeMetadata(input.metadata),
      summary: input.summary,
      userId: input.userId ?? null,
    },
  });
}

export async function listAuditLogs(limit = 250) {
  return prisma.auditLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      user: {
        select: {
          username: true,
        },
      },
    },
  });
}
