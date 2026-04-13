import Link from "next/link";

import { logoutAction } from "@/app/auth-actions";
import { getCurrentUser } from "@/lib/auth";

export async function AuthChrome() {
  const currentUser = await getCurrentUser();

  return (
    <div className="z-50 border-b border-[rgba(201,160,80,0.12)] bg-[rgba(5,8,14,0.88)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 lg:px-8">
        <div className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
          Coriolis Dossier
        </div>
        {currentUser ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--line-soft)] bg-[rgba(245,231,204,0.05)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--paper)]">
              {currentUser.username}
            </span>
            {currentUser.isAdmin ? (
              <Link href="/admin" className="coriolis-chip">
                Admin
              </Link>
            ) : null}
            <form action={logoutAction}>
              <button type="submit" className="coriolis-chip">
                Logout
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/login" className="coriolis-chip">
              Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
