"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { TEAM_HREF } from "@/lib/roster-routes";
import {
  authenticateUser,
  clearSession,
  createUserAccount,
  deleteUserAccount,
  ensureSuperadminAccount,
  getCurrentUser,
  setSession,
} from "@/lib/auth";
import { logMutation } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function sanitizeNextPath(rawValue: string, fallback = TEAM_HREF) {
  const trimmedValue = rawValue.trim();

  if (
    !trimmedValue.startsWith("/") ||
    trimmedValue.startsWith("//") ||
    trimmedValue.includes("\\")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmedValue, "http://localhost");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function redirectWithMessage(
  path: string,
  key: "error" | "notice",
  message: string,
): never {
  const searchParams = new URLSearchParams({ [key]: message });
  redirect(`${path}?${searchParams.toString()}`);
}

async function requireSuperadminActionUser(action: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    await logMutation({
      action: `${action}.denied`,
      actorUsername: "anonymous",
      entityType: "user",
      metadata: { reason: "unauthenticated" },
      summary: `Blocked anonymous attempt to ${action}.`,
      userId: null,
    });
    redirectWithMessage("/login", "error", "Please log in as the superadmin.");
  }

  if (!currentUser.isAdmin) {
    await logMutation({
      action: `${action}.denied`,
      actorUsername: currentUser.username,
      entityType: "user",
      metadata: { reason: "not-superadmin" },
      summary: `Blocked non-superadmin account ${currentUser.username} from ${action}.`,
      userId: currentUser.id,
    });
    redirectWithMessage(TEAM_HREF, "error", "Only the superadmin can manage accounts.");
  }

  return currentUser;
}

export async function loginAction(formData: FormData) {
  const username = readString(formData, "username");
  const password = readString(formData, "password");
  const nextPath = sanitizeNextPath(readString(formData, "next"));

  await ensureSuperadminAccount();
  const authenticatedUser = await authenticateUser(username, password);

  if (!authenticatedUser) {
    redirectWithMessage("/login", "error", "Invalid username or password.");
  }

  await setSession(authenticatedUser);
  redirect(nextPath);
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function adminCreateUserAction(formData: FormData) {
  const adminUser = await requireSuperadminActionUser("admin.user.create");
  const username = readString(formData, "username");
  const password = readString(formData, "password");

  try {
    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await createUserAccount({ username, password }, tx);
      await logMutation({
        action: "admin.user.create",
        db: tx,
        entityId: user.id,
        entityType: "user",
        metadata: { username: user.username },
        summary: `Created account ${user.username}.`,
        userId: adminUser.id,
      });

      return user;
    });
    revalidatePath("/admin");
    redirectWithMessage("/admin", "notice", `Created ${createdUser.username}.`);
  } catch (error) {
    await logMutation({
      action: "admin.user.create.failed",
      actorUsername: adminUser.username,
      entityType: "user",
      metadata: {
        error: error instanceof Error ? error.message : "unknown-error",
        username,
      },
      summary: `Failed to create account ${username || "<empty>"}.`,
      userId: adminUser.id,
    });
    const message = error instanceof Error ? error.message : "Unable to create account.";
    redirectWithMessage("/admin", "error", message);
  }
}

export async function adminDeleteUserAction(formData: FormData) {
  const adminUser = await requireSuperadminActionUser("admin.user.delete");
  const userId = readString(formData, "userId");

  if (userId === adminUser.id) {
    redirectWithMessage("/admin", "error", "You cannot delete the currently logged in admin.");
  }

  try {
    const deletedUser = await prisma.$transaction(async (tx) => {
      const user = await deleteUserAccount(userId, tx);
      await logMutation({
        action: "admin.user.delete",
        db: tx,
        entityId: user.id,
        entityType: "user",
        metadata: { username: user.username },
        summary: `Deleted account ${user.username}.`,
        userId: adminUser.id,
      });

      return user;
    });
    revalidatePath("/admin");
    redirectWithMessage("/admin", "notice", `Deleted ${deletedUser.username}.`);
  } catch (error) {
    await logMutation({
      action: "admin.user.delete.failed",
      actorUsername: adminUser.username,
      entityType: "user",
      metadata: {
        error: error instanceof Error ? error.message : "unknown-error",
        userId,
      },
      summary: `Failed to delete account ${userId || "<missing-id>"}.`,
      userId: adminUser.id,
    });
    const message = error instanceof Error ? error.message : "Unable to delete account.";
    redirectWithMessage("/admin", "error", message);
  }
}
