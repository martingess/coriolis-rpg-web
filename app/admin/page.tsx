import { redirect } from "next/navigation";

import {
  adminCreateUserAction,
  adminDeleteUserAction,
} from "@/app/auth-actions";
import { getCurrentUser, listUsers } from "@/lib/auth";
import { listAuditLogs } from "@/lib/audit-log";
import { TEAM_HREF } from "@/lib/roster-routes";

type AdminPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/admin");
  }

  if (!currentUser.isAdmin) {
    redirect(TEAM_HREF);
  }

  const [{ error, notice }, users, auditLogs] = await Promise.all([
    searchParams,
    listUsers(),
    listAuditLogs(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-8 md:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="coriolis-panel rounded-[1.8rem] border border-[var(--line-strong)] px-5 py-6 sm:px-6">
          <div className="space-y-3">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
              Administration
            </p>
            <h1 className="font-display text-[2rem] uppercase tracking-[0.12em] text-[var(--paper)]">
              User Accounts
            </h1>
            <p className="text-sm text-[var(--ink-muted)]">
              The superadmin account is provisioned from <code>SUPERADMIN_USERNAME</code> and <code>SUPERADMIN_PASSWORD</code>.
            </p>
          </div>

          {error ? (
            <div className="mt-5 rounded-[1rem] border border-[rgba(222,123,90,0.22)] bg-[rgba(222,123,90,0.1)] px-4 py-3 text-sm text-[var(--paper)]">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="mt-5 rounded-[1rem] border border-[rgba(201,160,80,0.16)] bg-[rgba(201,160,80,0.08)] px-4 py-3 text-sm text-[var(--paper)]">
              {notice}
            </div>
          ) : null}

          <form action={adminCreateUserAction} className="mt-6 space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                Username
              </span>
              <input className="coriolis-input" name="username" required />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[0.72rem] uppercase tracking-[0.28em] text-[var(--ink-faint)]">
                Password
              </span>
              <input className="coriolis-input" name="password" type="password" required />
            </label>
            <button type="submit" className="coriolis-chip">
              Create user
            </button>
          </form>

          <div className="mt-8 overflow-hidden rounded-[1.2rem] border border-[var(--line-soft)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[rgba(245,231,204,0.06)] text-left">
                  <th className="px-4 py-3 text-[0.66rem] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                    Username
                  </th>
                  <th className="px-4 py-3 text-[0.66rem] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                    Type
                  </th>
                  <th className="px-4 py-3 text-[0.66rem] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--line-soft)]">
                    <td className="px-4 py-3 text-sm text-[var(--paper)]">{user.username}</td>
                    <td className="px-4 py-3 text-sm text-[var(--ink-muted)]">
                      {user.id === currentUser.id ? "superadmin" : "user"}
                    </td>
                    <td className="px-4 py-3">
                      <form action={adminDeleteUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-[rgba(222,123,90,0.24)] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[var(--paper)] transition hover:bg-[rgba(222,123,90,0.12)]"
                          disabled={user.id === currentUser.id}
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="coriolis-panel rounded-[1.8rem] border border-[var(--line-strong)] px-5 py-6 sm:px-6">
          <div className="space-y-3">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
              Mutation Audit
            </p>
            <h2 className="font-display text-[1.6rem] uppercase tracking-[0.12em] text-[var(--paper)]">
              Activity Log
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              Only write operations are stored here. Regular page reads are not logged.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {auditLogs.map((entry) => (
              <article
                key={entry.id}
                className="rounded-[1.1rem] border border-[var(--line-soft)] bg-[rgba(245,231,204,0.03)] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[var(--ink-faint)]">
                    {entry.action}
                  </p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {entry.createdAt.toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-sm text-[var(--paper)]">{entry.summary}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                  {entry.actorUsername} · {entry.entityType}
                  {entry.entityId ? ` · ${entry.entityId}` : ""}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
