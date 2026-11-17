# FairSplit — Session Handoff

> **For Claude:** Read this file at the start of every new session to understand project state and continue where we left off.

---

## Project State: Phase 1 Complete, Local Dev Running

Phase 1 is fully functional. The app runs locally at http://localhost:3000 with Supabase as the backend. All core features (auth, property management, billing cycles, bill splitting, tenant views) are working. The initial setup is done — migrations applied, users seeded, demo data loaded.

---

## What Has Been Accomplished

### Phase 1 (Complete)

**Infrastructure & Auth**
- Next.js 14 App Router project with TypeScript, Tailwind CSS, shadcn/ui
- Supabase PostgreSQL backend with 11 tables and full RLS policies
- Authentication system with password login (dev) and magic link (production)
- Middleware-enforced role-based routing for admin, owner, and tenant roles
- Tenant invite flow with claim tokens

**Database**
- 6 migrations applied: initial schema, seed plans, trigger functions, RLS recursion fix, bill flags enhancements, cross-table RLS recursion fix
- 11 tables: profiles, subscription_plans, user_subscriptions, properties, property_tenants, billing_cycles, bills, bill_splits, bill_flags, notifications, audit_log
- `SECURITY DEFINER` function `is_admin()` to prevent infinite RLS recursion across all admin policies
- Complete seed data for 575 McKinney demo property

**Owner Dashboard**
- Property CRUD (create, update, soft delete)
- Tenant invite system with email-based invitations
- Tenant status tracking (invited, active, departed)
- Billing cycle management (draft, open, closed)
- Manual bill entry with category selection (internet, electricity, water, other)
- Automatic person-days split calculation on bill creation

**Tenant Dashboard**
- Read-only bill viewing grouped by billing cycle
- Bill details with person-days breakdown
- Invite claim flow via token URL
- Settings page (scaffold)

**Admin Dashboard**
- Route scaffold created (dashboard, properties, users pages exist)
- No functional admin features yet

**UI/Layout**
- 19 shadcn/ui components installed
- Responsive sidebar with role-based navigation
- Topbar with user menu and logout
- Mobile drawer navigation
- Dashboard shell layout wrapper
- Shared components: bill-split-table, metric-card
- Notification bell UI (scaffold)

**Server Actions**
- `lib/actions/properties.ts` — Property CRUD with Zod validation
- `lib/actions/tenants.ts` — Invite, claim, update tenants
- `lib/actions/cycles.ts` — Billing cycle CRUD
- `lib/actions/bills.ts` — Bill creation with automatic person-days split calculation
- `lib/actions/notifications.ts` — Scaffold

**Documentation**
- 21 context documents: 10 PRDs, 4 tech specs, 2 product discovery, 1 competitor analysis, 4 reference docs
- `CLAUDE.md` with project coding standards
- This handoff document

### Bugs Fixed
- **RLS infinite recursion — admin self-reference** (`004_fix_rls_recursion.sql`): Admin policies on all 12 tables referenced `profiles` via inline subquery, which triggered `profiles`' own admin policies recursively. Fixed by creating a `SECURITY DEFINER` function `public.is_admin()` that bypasses RLS.
- **RLS infinite recursion — cross-table cycle** (`006_fix_cross_table_rls_recursion.sql`): `properties` had a tenant policy querying `property_tenants`, and `property_tenants` had owner policies querying `properties`. Postgres evaluates all SELECT policies (OR'd), creating infinite recursion. Fixed by creating two `SECURITY DEFINER` functions — `is_property_owner(property_id)` and `is_property_tenant(property_id)` — and updating all cross-table policies to use them.

---

## What's Left to Build

### Phase 2 (Not Started)
- [ ] PDF bill upload + Claude AI parsing (`ANTHROPIC_API_KEY`)
- [ ] Invoice PDF generation for tenants
- [ ] Email notifications via Resend (`RESEND_API_KEY`)
- [ ] Bill flagging & escalation system (DB tables exist, UI not built)
- [ ] Dashboard charts & analytics (recharts installed, not wired)
- [ ] In-app notifications (DB table + bell UI exist, realtime not connected)
- [ ] Admin dashboard functionality

### Phase 3 (Not Started)
- [ ] Stripe payment processing (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- [ ] Subscription plan enforcement
- [ ] Full admin platform (user management, property oversight)
- [ ] Landing page / marketing site
- [ ] Mobile responsiveness audit
- [ ] Audit logging and CSV export
- [ ] Performance optimization
- [ ] Deployment to Vercel

---

## Key Information

### Supabase Project
- **Dashboard**: https://supabase.com/dashboard/project/pvpsoxfpoifxcmvcdmdo
- **Project URL**: https://pvpsoxfpoifxcmvcdmdo.supabase.co
- **API Keys**: https://supabase.com/dashboard/project/pvpsoxfpoifxcmvcdmdo/settings/api

### Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | `SEED_ADMIN_EMAIL` (default admin@example.com) | `SEED_ADMIN_PASSWORD` (default demo123!) |
| Owner | shekar@example.com | demo123! |
| Tenant (active) | val@example.com | demo123! |
| Tenant (active) | navya@example.com | demo123! |
| Tenant (active) | vineesh@example.com | demo123! |
| Tenant (active) | divya@example.com | demo123! |
| Tenant (departed) | anil@example.com | demo123! |

### User Preferences
- Password auth enabled for dev testing; magic link for production
- Admin account is set via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env.local` (never commit real credentials)
- Amounts stored as integers (cents) in database, formatted to dollars at presentation
- Dates handled in UTC

---

## Setup Steps (For Fresh Environment)

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://pvpsoxfpoifxcmvcdmdo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>
```

### 3. Run database migrations (in Supabase SQL Editor, in order)
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_seed_plans.sql`
3. `supabase/migrations/003_functions.sql`
4. `supabase/migrations/004_fix_rls_recursion.sql`
5. `supabase/migrations/005_bill_flags_enhancements.sql`
6. `supabase/migrations/006_fix_cross_table_rls_recursion.sql`

### 4. Create test users
```bash
npm run seed:users
```

### 5. Seed demo data
Run `supabase/seed.sql` in Supabase SQL Editor

### 6. Start dev server
```bash
npm run dev
```
Open http://localhost:3000

---

## Key Files for Context

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project coding standards |
| `context/IMPLEMENTATION_PLAN.md` | Detailed progress tracker |
| `supabase/migrations/001_initial_schema.sql` | Full database schema + RLS |
| `supabase/migrations/004_fix_rls_recursion.sql` | RLS recursion fix |
| `supabase/seed.sql` | 575 McKinney demo data |
| `lib/actions/*.ts` | All server-side business logic |
| `lib/calculations/person-days.ts` | Core bill splitting algorithm |
| `middleware.ts` | Auth + role-based route protection |
| `context/seed-data/575-mckinney-property-data.md` | Test data reference |

---

## Architectural Decisions

1. **Calculation on write, not read** — Bill splits pre-calculated and stored in `bill_splits` table when a bill is created
2. **Denormalized `property_id`** — On bills, bill_splits, and other child tables for efficient RLS policy evaluation
3. **Server actions for mutations** — API routes only for file uploads, webhooks, and streaming
4. **`SECURITY DEFINER` for RLS checks** — `is_admin()`, `is_property_owner(id)`, and `is_property_tenant(id)` bypass RLS to prevent cross-table recursion
5. **Amounts in cents** — All monetary values stored as integers to avoid floating-point issues
6. **Atomic design** — Components organized as atoms (ui/), molecules/organisms (shared/), with role-specific directories (owner/, tenant/, admin/)
