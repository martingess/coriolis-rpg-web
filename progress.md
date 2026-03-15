Original prompt: На любой remove в игре добавь модалку с подтверждением

- 2026-03-15: Found all current remove/delete entry points in `components/roster-app.tsx` and `components/team-screen.tsx`.
- 2026-03-15: Confirm flow currently mixes one `window.confirm` with many direct removes; implementing a shared confirmation modal in the roster app.
- 2026-03-15: Added a shared confirmation modal in `components/roster-app.tsx` and routed character, repeater, and team-repeater removals through it.
- 2026-03-15: Added Playwright coverage for confirm/cancel flows in `e2e/roster.spec.ts`.
- 2026-03-15: Verification: targeted `eslint` on touched TSX/spec files passed; `tsc --noEmit` passed.
- 2026-03-15: Full `pnpm lint` still fails on the pre-existing `scripts/import-sqlite-backup.ts` ban on `@ts-nocheck`.
- 2026-03-15: Targeted Playwright run could not complete because the app booted with Prisma expecting a Postgres `DATABASE_URL`, while the existing Playwright config still points at `file:./e2e.db`.
