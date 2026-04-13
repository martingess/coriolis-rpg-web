import { redirect } from "next/navigation";

import { loginAction } from "@/app/auth-actions";
import { getCurrentUser } from "@/lib/auth";
import { TEAM_HREF } from "@/lib/roster-routes";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(TEAM_HREF);
  }

  const { error, next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") ? next : TEAM_HREF;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[560px] items-center px-4 py-10">
      <section className="coriolis-panel w-full rounded-[1.8rem] border border-[var(--line-strong)] px-5 py-6 sm:px-6">
        <div className="space-y-3">
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
            Coriolis Dossier
          </p>
          <h1 className="font-display text-[2rem] uppercase tracking-[0.12em] text-[var(--paper)]">
            Login
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Sign in to make any changes to characters, crew data, portraits, or inventory.
          </p>
        </div>

        {error ? (
          <div className="mt-5 rounded-[1rem] border border-[rgba(201,160,80,0.16)] bg-[rgba(201,160,80,0.08)] px-4 py-3 text-sm text-[var(--paper)]">
            {error}
          </div>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="flex flex-col gap-2">
            <span className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
              Username
            </span>
            <input className="coriolis-input" name="username" autoComplete="username" required />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
              Password
            </span>
            <input
              className="coriolis-input"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="coriolis-chip">
            Login
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--ink-muted)]">
          New accounts can only be created by the superadmin.
        </p>
      </section>
    </main>
  );
}
