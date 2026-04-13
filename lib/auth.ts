import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { Prisma, type PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);

const SESSION_COOKIE_NAME = "coriolis_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const DEV_FALLBACK_SECRET = "coriolis-dev-session-secret-change-me";
const MIN_PASSWORD_LENGTH = 8;
const MIN_USERNAME_LENGTH = 3;
const SYSTEM_ACTOR = "system";

type AuthClient = PrismaClient | Prisma.TransactionClient;

type SessionPayload = {
  exp: number;
  userId: string;
  username: string;
};

export type SessionUser = {
  id: string;
  isAdmin: boolean;
  username: string;
};

type UserIdentity = {
  id: string;
  username: string;
};

type SuperadminBootstrapResult = {
  created: boolean;
  passwordSynced: boolean;
  user: UserIdentity;
} | null;

function getSessionSecret() {
  const configuredSecret = process.env.SESSION_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_SECRET;
  }

  throw new Error("SESSION_SECRET is required in production.");
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function getConfiguredSuperadminCredentials() {
  const username = normalizeUsername(process.env.SUPERADMIN_USERNAME ?? "");
  const password = process.env.SUPERADMIN_PASSWORD?.trim() ?? "";

  if (!username || !password) {
    return null;
  }

  return {
    password,
    username,
  };
}

export function isAdminUsername(username: string) {
  const configuredSuperadmin = getConfiguredSuperadminCredentials();

  if (!configuredSuperadmin) {
    return false;
  }

  return normalizeUsername(username) === configuredSuperadmin.username;
}

function signSessionPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function createSessionToken(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signSessionPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseSessionToken(token: string): SessionPayload | null {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signSessionPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(providedSignature, "utf8");

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  const normalizedPassword = password.trim();

  if (normalizedPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(normalizedPassword, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedKey] = passwordHash.split(":");

  if (!salt || !storedKey) {
    return false;
  }

  const derivedKey = (await scrypt(password.trim(), salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(storedKey, "hex");

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}

export async function setSession(user: { id: string; username: string }) {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const token = createSessionToken({
    userId: user.id,
    username: user.username,
    exp: Math.floor(expires.getTime() / 1000),
  });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    expires,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = parseSessionToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user || normalizeUsername(user.username) !== normalizeUsername(payload.username)) {
    return null;
  }

  return {
    id: user.id,
    isAdmin: isAdminUsername(user.username),
    username: user.username,
  };
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required. Please log in.");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser();

  if (!user.isAdmin) {
    throw new Error("Administrator access is required.");
  }

  return user;
}

export async function authenticateUser(username: string, password: string) {
  const normalizedUsername = normalizeUsername(username);
  const user = await prisma.user.findUnique({
    where: {
      username: normalizedUsername,
    },
    select: {
      id: true,
      passwordHash: true,
      username: true,
    },
  });

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
  };
}

export async function createUserAccount(
  input: {
    password: string;
    username: string;
  },
  client: AuthClient = prisma,
) {
  const normalizedUsername = normalizeUsername(input.username);

  if (isAdminUsername(normalizedUsername)) {
    throw new Error("This username is reserved for the superadmin account.");
  }

  if (normalizedUsername.length < MIN_USERNAME_LENGTH) {
    throw new Error(`Username must be at least ${MIN_USERNAME_LENGTH} characters long.`);
  }

  const existingUser = await client.user.findUnique({
    where: {
      username: normalizedUsername,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new Error("That username is already taken.");
  }

  const passwordHash = await hashPassword(input.password);
  return client.user.create({
    data: {
      username: normalizedUsername,
      passwordHash,
    },
    select: {
      id: true,
      username: true,
      createdAt: true,
    },
  });
}

export async function ensureSuperadminAccount(
  client: PrismaClient = prisma,
): Promise<SuperadminBootstrapResult> {
  const configuredSuperadmin = getConfiguredSuperadminCredentials();

  if (!configuredSuperadmin) {
    return null;
  }

  return client.$transaction(async (tx) => {
    const existingUser = await tx.user.findUnique({
      where: {
        username: configuredSuperadmin.username,
      },
      select: {
        id: true,
        passwordHash: true,
        username: true,
      },
    });

    if (!existingUser) {
      const passwordHash = await hashPassword(configuredSuperadmin.password);
      try {
        const createdUser = await tx.user.create({
          data: {
            username: configuredSuperadmin.username,
            passwordHash,
          },
          select: {
            id: true,
            username: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "system.superadmin.bootstrap",
            actorUsername: SYSTEM_ACTOR,
            entityId: createdUser.id,
            entityType: "user",
            metadata: { username: createdUser.username },
            summary: `Bootstrapped superadmin account ${createdUser.username}.`,
            userId: null,
          },
        });

        return {
          created: true,
          passwordSynced: false,
          user: createdUser,
        };
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        ) {
          throw error;
        }
      }
    }

    const persistedUser =
      existingUser ??
      (await tx.user.findUniqueOrThrow({
        where: {
          username: configuredSuperadmin.username,
        },
        select: {
          id: true,
          passwordHash: true,
          username: true,
        },
      }));

    const passwordMatches = await verifyPassword(
      configuredSuperadmin.password,
      persistedUser.passwordHash,
    );

    if (passwordMatches) {
      return {
        created: false,
        passwordSynced: false,
        user: {
          id: persistedUser.id,
          username: persistedUser.username,
        },
      };
    }

    const passwordHash = await hashPassword(configuredSuperadmin.password);
    const updatedUser = await tx.user.update({
      where: {
        id: persistedUser.id,
      },
      data: {
        passwordHash,
      },
      select: {
        id: true,
        username: true,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "system.superadmin.password-sync",
        actorUsername: SYSTEM_ACTOR,
        entityId: updatedUser.id,
        entityType: "user",
        metadata: { username: updatedUser.username },
        summary: `Synchronized superadmin credentials for ${updatedUser.username}.`,
        userId: null,
      },
    });

    return {
      created: false,
      passwordSynced: true,
      user: updatedUser,
    };
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      username: true,
      createdAt: true,
    },
  });
}

export async function deleteUserAccount(userId: string, client: AuthClient = prisma) {
  const user = await client.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (isAdminUsername(user.username)) {
    throw new Error("The superadmin account cannot be deleted.");
  }

  await client.user.delete({
    where: {
      id: userId,
    },
  });

  return user;
}
