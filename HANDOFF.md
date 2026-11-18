# FairSplit — Session Handoff

> **For Claude:** Read this at the start of every session. Then check the project memory for account rules.

_Last updated: 18 Nov 2026, after the overnight build (Phase 1 built, early Phase 2 started)_

## Where things stand

The Phase 1 pilot features are built, merged, tested and deployed, along with the first Phase 2 pieces. What Phase 1 still needs is real-world setup (real emails, Resend), not code.

| | |
|---|---|
| Live app | https://fairsplit-hymavar.vercel.app (Vercel team `hymavar-val`, project `fairsplit-hymavar`) |
| Database | Supabase project `pvpsoxfpoifxcmvcdmdo` ("FairSplit", us-east-1, personal org) |
| Repo | `Valelf/fairsplit`, branch `fairsplit-phase-1` (not merged to `main` yet; see "Needs a decision") |
| Mock-ups | Private Design canvas, 36 artboards (A–Q + user flows); link in project memory |
| Old McKinney app (favour for Shekar) | https://mckinney-bills-575.vercel.app, branch `mckinney-legacy-update`, worktree `../FairSplit-legacy`; waiting on Shekar's bills |

**Accounts are personal only** (GitHub Valelf, Supabase vvrsvallabh, Vercel `hymavar-val`). The default Vercel CLI login on this machine is a different account. Always pass:
`--global-config C:/Users/vvrsv/.vercel-personal --scope hymavar-val`

## What the app does now

**Landlord**
- Sign up by magic link at `/signup`, then a 4-step onboarding wizard: house → tenants with invite links → first cycle and bill → split preview.
- Dashboard; manage houses (edit and delete, address editable) and tenants (edit, copy or regenerate invite, mark departed with a final-share preview).
- Utility accounts per house; new bills pre-fill from the last bill.
- Cycles with dates: close and reopen, edit and delete bills.
- Split rules per bill: by days lived (default) or equally among the people who lived there, plus exclusions with a reason.
- Splits recalculate in the database in one transaction and keep payment status. Closed cycles are never re-split.
- Payments: owner's Venmo/Cash App/PayPal/Zelle handles, a ledger (owed / marked paid / confirmed / overdue), confirm and reopen.
- "Send to tenants" email per cycle, daily reminder cron, owner digest.
- Questions inbox: reply, resolve, correct the amount.

**Tenant**
- Claim the invite by magic link; see their share with the math ("30 of 110 person-days" / "split equally among 4"); "Pay your share" with deep links; "I've paid" and undo.
- Ask a question about a bill; see history; email-reminder opt-out.
- Phone-first layout with a bottom tab bar; installable (PWA manifest).

**Admin (you)**
- Pilot health: counts, pending invites, nightly-job and keep-alive timestamps.
- Users and user detail: change role, extend the founding plan (+6 months / +1 year / no end / pick a date) or grant a plan.
- Properties and an audit log with filters.

**Public**
- Redesigned landing page (ink + teal, Plex / Bricolage), `/how-it-works`, `/help`.
- Draft `/terms`, `/privacy` and `/resources/lease-addendum`, all marked as needing legal review.

## Roadmap

| Phase | Dates | Status |
|---|---|---|
| P0 Make it safe | to 30 Nov 2026 | Done |
| P1 Shekar pilot live | 1–21 Dec 2026 | Code done; needs real emails, Resend, and Shekar onboarding |
| P2 Private beta | 4 Jan – 14 Feb 2027 | Started: sign-up/onboarding, utility accounts, split rules, questions done. Still to do: rooms, memberships (owner + tenant in one account), email bill ingest |
| P3 Paid launch | 15 Feb – 4 Apr 2027 | Help and legal drafts done; Stripe, plan limits, entity, lawyer review to do |

### Next up
1. Real emails for Shekar and the McKinney tenants: edit them in the app (tenant email is editable until claimed), or use `scripts/pilot/pilot-data.local.json` + `npm run seed:pilot` on a fresh DB.
2. Resend: create an account (personal), verify a sending domain, set `RESEND_API_KEY` + `EMAIL_FROM` in Vercel, and configure Supabase auth to use Resend SMTP (the built-in sender is rate-limited).
3. `ANTHROPIC_API_KEY` in Vercel for PDF parsing (owner-only, rate-limited).
4. Connect GitHub to the Vercel project for auto-deploys (today: CLI deploys).
5. Shekar's legacy-app bills (see memory), then retire the old app once FairSplit is live for him.

## Needs a decision
- **Confirmed payments after a recalc:** if an amount changes after a tenant's payment was confirmed, should the status go back to "owed"? Today it stays confirmed.
- **Default branch:** `main` still holds the old single-page app. GitHub only runs scheduled workflows (the Supabase keep-alive) from the default branch. Merge `fairsplit-phase-1` into `main`, or make it the default branch.
- **Wording:** tenants see "My homes"; landlords are called "Landlord" in the UI.

## Database workflow (no Docker on this machine)

```bash
npm run db:migrate                                       # SAFE: apply only pending migrations (advisory-locked)
npm run db:backup -- ../FairSplit-backups/<date>.json    # JSON export of all app tables
npm run db:rebuild -- --yes                              # DESTRUCTIVE: wipe + apply all migrations (dev only)
npm run seed:pilot                                       # admin, Shekar (founding plan), McKinney + Frisco
```
Live check scripts (real users against the live DB; each cleans up after itself):
`npx tsx scripts/db/<name>.ts`, where `<name>` is `security-check`, `payments-check`, `recalc-check`, `utility-accounts-check`, `onboarding-check`, `questions-check`, `owner-mgmt-check` or `claim-check`.

They connect through the session pooler using `SUPABASE_DB_PASSWORD` from `.env.local`. Migrations live in `supabase/migrations/<timestamp>_name.sql`; `20261118*` are tonight's (security hardening → payments → owner management → notifications → owner sign-up → review fixes → utility accounts → split rules → bill questions).

## Testing
- `npm run check`: typecheck, lint and Vitest (97 tests at last count).
- `npm run test:e2e`: Playwright, 15 specs, desktop 1280 + mobile 375. It builds the app and serves it on port 3131, runs serially against the live pilot DB, and restores the data it changes. Run it before deploying.

## Env vars
- `.env.local` holds everything; never commit it, because the repo is public.
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD` (scripts only).
- App: `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` (set in Vercel too).
- Not set yet: `RESEND_API_KEY`, `EMAIL_FROM`, `ANTHROPIC_API_KEY`.
- Seed: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DEMO_PASSWORD`.

## Accounts in the seeded database
- Admin: the `SEED_ADMIN_EMAIL` account.
- Owner: `shekar@example.com`, a placeholder; Pro, comped until 2027-11-18.
- McKinney tenants: `navya@`, `vineesh@`, `val@`, `divya@` (active), `anil@` (departed), all `@example.com`.
- Frisco house: no tenants; the address is a placeholder.

## Known gaps / cleanup
- Delete `supabase/seed.sql` (old wrong numbers) and `scripts/seed-users.ts`; both are obsolete.
- Delete `app/_legacy/` (excluded from tooling).
- Roles are one per profile, so a person can't be owner and tenant at once. That's the Phase 2 memberships work.
- The old `bill_flags` table remains, but the UI uses question threads now.
- The DB password was shared in chat on 18 Nov: rotate it in Supabase, then update `.env.local`.
- Agent worktrees live under `.claude/worktrees/` (gitignored). Remove them with `git worktree remove` when no longer needed.

## Architecture decisions
1. Splits are computed on write (TS for previews; SQL `recalculate_*` functions for storage) and the two must match. `recalc-check` enforces this.
2. `property_id` is denormalized on child tables for RLS.
3. Server actions handle mutations; every exported action re-checks auth and ownership. API routes are only for uploads, PDFs, cron and webhooks.
4. `SECURITY DEFINER` helpers with a fixed `search_path` and explicit grants handle cross-table checks and privileged transitions (`claim_invite`, `become_owner`, payment RPCs).
5. Money is stored in cents and dates are UTC. FairSplit never holds tenants' money.
