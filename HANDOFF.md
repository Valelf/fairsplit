# FairSplit — Session Handoff

> **For Claude:** Read this at the start of every session. Then check the project memory for account rules.

_Last updated: 18 Nov 2026 (end of Phase 0)_

## Where things stand

**Phase 0 (make it safe) is done.** The app is deployed and the database has been rebuilt from migrations, with security fixes verified against the live project.

| | |
|---|---|
| Live app | https://fairsplit-hymavar.vercel.app (Vercel team `hymavar-val`, project `fairsplit-hymavar`) |
| Database | Supabase project `pvpsoxfpoifxcmvcdmdo` ("FairSplit", us-east-1, personal org) |
| Repo | `Valelf/fairsplit`, branch `fairsplit-phase-1` |
| Old McKinney app (favour for Shekar) | https://mckinney-bills-575.vercel.app, branch `mckinney-legacy-update`, worktree `../FairSplit-legacy` |

**Accounts are personal only** (GitHub Valelf, Supabase vvrsvallabh, Vercel `hymavar-val`). The default Vercel CLI login on this machine is a different account. Always pass:
`--global-config C:/Users/vvrsv/.vercel-personal --scope hymavar-val`

## Roadmap

| Phase | Dates | Goal |
|---|---|---|
| P0 Make it safe | to 30 Nov 2026 | **Done** |
| P1 Shekar pilot live | 1–21 Dec 2026 | Shekar's houses and real tenant logins; December bills settled in the app |
| P2 Private beta | 4 Jan – 14 Feb 2027 | Owner sign-up, rooms, recurring bills, AI ingest, 3–5 more landlords |
| P3 Paid launch | 15 Feb – 4 Apr 2027 | Stripe, plan limits, marketing site |

Detail lives in the plan and mock-ups (private artifacts; links are in the project memory).

### Next up (Phase 1)
1. Real emails for Shekar and the McKinney tenants: put them in `scripts/pilot/pilot-data.local.json` (gitignored), or edit them in the app once an edit screen exists.
2. Payment tracking: a status on each split (owed → marked paid → confirmed), balances, due dates, the owner's Venmo/Zelle/Cash App handles.
3. Owner screens for actions that already exist on the server: close a cycle, edit/delete a bill, mark a tenant departed, edit a property (Frisco address). Recalculate splits when tenant dates change, in one transaction.
4. "Your bills are ready" email through Resend, with a custom SMTP sender for Supabase auth emails. The built-in sender is rate-limited.
5. Connect the GitHub repo to the Vercel project for auto-deploys. Today deploys run from the CLI.

## Phase 0: what changed

**Database** (`supabase/migrations/20261118*`)
- `profiles.role` and `profiles.email` can only be changed by an admin or the service role (trigger). Sign-up metadata can no longer set a role; new users start as `tenant`.
- Removed the open `WITH CHECK (true)` inserts on profiles, notifications and audit_log.
- Flags can only be raised on bills the tenant can see. Departed tenants only see bills that started before their leave date.
- Added constraints, invite expiry (30 days), cycle `start_date`/`end_date`, and `user_subscriptions.comp_until` for the founding plan.
- New RPCs: `get_invite` (public), `claim_invite` (the signed-in user's verified email must match the invite), `ping` (keep-alive).
- New private `bill-pdfs` storage bucket with policies; nightly `pg_cron` job `fairsplit-nightly`.

**App**
- Split rounding uses largest remainder, so shares always add up to the bill. Covered by Vitest tests, including the corrected 575 McKinney numbers.
- `createNotification`, `notifyUser` and `calculateAndStoreSplits` moved to `lib/server/*`, so browsers can't call them.
- `/auth/confirm` handles both the PKCE `?code=` and `token_hash` link styles, plus a safe `?next=`.
- The claim flow works end to end. Owners get a copyable invite link; no email is sent yet.
- Demo credentials removed from the login page. Full page load after sign-in and sign-out, so the previous user's menu isn't shown. Date and empty-list query fixes.

**Tooling**
- `npm run check` runs typecheck, lint and tests.
- GitHub Actions: `ci.yml`, and `supabase-keepalive.yml`, which pings every 3 days (repo secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`).
- Supabase auth URLs are managed in `supabase/config.toml` and applied with `npx supabase@3.2.0 config push --yes`.

## Database workflow (no Docker on this machine)

```bash
npm run db:backup -- ../FairSplit-backups/<date>.json   # JSON export of all app tables
npm run db:rebuild -- --yes                             # DESTRUCTIVE: wipe + apply all migrations
npm run seed:pilot                                      # admin, Shekar (founding plan), McKinney + Frisco, Sept–Nov 2025
npm run db:security-check                               # live RLS checks as real users
```
- These scripts connect through the session pooler using `SUPABASE_DB_PASSWORD` from `.env.local`.
- To add a migration: create `supabase/migrations/<timestamp>_name.sql`. The rebuild script applies migrations in order and records them in the CLI migration history.
- There is no incremental "apply only new migrations" script yet; add one before the pilot holds real data.

## Accounts in the seeded database

- Passwords are in `.env.local` (`SEED_ADMIN_PASSWORD`, `SEED_DEMO_PASSWORD`). Never commit them; the repo is public.
- Admin: the `SEED_ADMIN_EMAIL` account.
- Owner: `shekar@example.com` (placeholder until the real email is known). Pro plan, comped until 2027-11-18.
- Tenants (575 McKinney): `navya@`, `vineesh@`, `val@`, `divya@` (active) and `anil@` (departed), all `@example.com`.
- Frisco house: no tenants yet; the address is a placeholder.

## Known gaps / cleanup

- `supabase/seed.sql` and `scripts/seed-users.ts` are obsolete; `seed-pilot.ts` replaces them. Delete both files. The seed.sql file contains the old wrong numbers.
- `app/_legacy/` is excluded from typecheck and lint; delete it when convenient.
- PDF parsing needs `ANTHROPIC_API_KEY` in Vercel and `.env.local`; it isn't set yet. Email needs `RESEND_API_KEY`.
- Roles are still one per profile, so a person can't be both owner and tenant. Memberships move to per-property roles in Phase 2.
- The DB password was shared in chat on 18 Nov. Rotate it in the Supabase dashboard, then update `.env.local`.

## Architecture decisions

1. Splits are calculated when a bill is written and stored in `bill_splits`; only tenants with more than 0 days get a row.
2. `property_id` is denormalized on child tables for RLS.
3. Server actions handle mutations. API routes are only for uploads, PDFs and webhooks.
4. `SECURITY DEFINER` helpers (`is_admin`, `is_property_owner`, `is_property_tenant`, `tenant_can_see_*`) avoid RLS recursion.
5. Money is stored in cents and dates are UTC.
