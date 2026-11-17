# FairSplit — Implementation Plan & Progress Tracker

> Master reference for project progress. Read at the start of every session.

---

## Current Status: Phase 1 Complete | Phase 2 Not Started

---

## Phase 1 — Complete

### Infrastructure
- [x] Rename project from `Bills Template` to `FairSplit`
- [x] Generate all 21 context documents (PRDs, tech specs, product discovery, reference)
- [x] Set up Supabase project (pvpsoxfpoifxcmvcdmdo)
- [x] Install all dependencies (shadcn/ui, supabase, zod, recharts, react-hook-form, etc.)
- [x] Configure Tailwind CSS with shadcn/ui design tokens and dark mode

### Database (11 tables + 4 migrations)
- [x] `001_initial_schema.sql` — 11 tables with full RLS policies and indexes
- [x] `002_seed_plans.sql` — Free/Pro/Business subscription plan definitions
- [x] `003_functions.sql` — `handle_updated_at()` trigger + `handle_new_user()` profile auto-creation
- [x] `004_fix_rls_recursion.sql` — `is_admin()` SECURITY DEFINER function replacing all inline admin subqueries
- [x] `seed.sql` — Complete 575 McKinney property with 5 tenants, 2 cycles, 6 bills, 30 splits
- [x] `scripts/seed-users.ts` — Test user creation script

### Authentication & Authorization
- [x] Supabase Auth integration (password + magic link)
- [x] Middleware-enforced route protection (`middleware.ts`)
- [x] Role-based routing (admin → `/dashboard/admin`, owner → `/dashboard/owner`, tenant → `/dashboard/tenant`)
- [x] Login page with password auth (dev) and magic link (production)
- [x] Auth callback handler (`/auth/confirm`)
- [x] Tenant invite claim flow (`/claim/[token]`)

### UI Components (19 shadcn/ui + custom)
- [x] shadcn/ui: button, card, dialog, input, label, select, table, tabs, badge, separator, sheet, skeleton, toast, toaster, tooltip, avatar, dropdown-menu, popover, slot
- [x] Layout: dashboard-shell, sidebar (role-based nav), topbar (user menu), mobile-nav
- [x] Shared: bill-split-table, metric-card
- [x] Notification bell (UI scaffold)

### Owner Dashboard
- [x] Portfolio overview (`/dashboard/owner/dashboard`)
- [x] Properties list (`/dashboard/owner/properties`)
- [x] Create property form with Zod validation (`/dashboard/owner/properties/new`)
- [x] Property details with tabs (`/dashboard/owner/properties/[id]/overview`)
- [x] Tenant invite page (`/dashboard/owner/properties/[id]/tenants/invite`)
- [x] Create billing cycle (`/dashboard/owner/properties/[id]/cycles/new`)
- [x] Cycle details view (`/dashboard/owner/properties/[id]/cycles/[cycleId]`)
- [x] Add bill with automatic person-days split (`/dashboard/owner/properties/[id]/bills/new`)

### Tenant Dashboard
- [x] Personal overview (`/dashboard/tenant/dashboard`)
- [x] Assigned properties list (`/dashboard/tenant/properties`)
- [x] Bills list by property (`/dashboard/tenant/properties/[id]/bills`)
- [x] Bill details by cycle (`/dashboard/tenant/properties/[id]/bills/[cycleId]`)
- [x] Settings page scaffold (`/dashboard/tenant/settings`)

### Admin Dashboard (Scaffold Only)
- [x] Admin overview page (`/dashboard/admin/dashboard`)
- [x] Properties listing page (`/dashboard/admin/properties`)
- [x] Users management page (`/dashboard/admin/users`)

### Server Actions
- [x] `lib/actions/properties.ts` — createProperty, updateProperty, deleteProperty (soft delete)
- [x] `lib/actions/tenants.ts` — inviteTenant, claimInvite, updateTenant
- [x] `lib/actions/cycles.ts` — createCycle, updateCycle, closeCycle
- [x] `lib/actions/bills.ts` — createBill, calculateAndStoreSplits, deleteBill
- [x] `lib/actions/notifications.ts` — scaffold

### Core Algorithm
- [x] `lib/calculations/person-days.ts` — calculateBillSplitCents, calculateCycleSplits

### Bugs Fixed
- [x] **RLS infinite recursion** — Admin policies across all 12 tables used `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`, which triggered profiles' own admin SELECT policy recursively. Fixed with `SECURITY DEFINER` function `public.is_admin()` in migration 004.

---

## Phase 2 — Not Started

- [ ] PDF bill upload + AI parsing (Claude API via `ANTHROPIC_API_KEY`)
  - Upload PDF to Supabase Storage
  - Send to Claude for field extraction (provider, amount, dates, category)
  - Pre-fill bill form with parsed data
  - User confirms/edits before saving
- [ ] Invoice PDF generation
  - Generate per-tenant PDF invoices for a billing cycle
  - Include person-days breakdown and amount owed
- [ ] Email notifications (Resend via `RESEND_API_KEY`)
  - Tenant invite emails
  - New bill published notifications
  - Bill flagging status updates
- [ ] Bill flagging & escalation system
  - DB tables exist (`bill_flags`), UI not built
  - Tenant can flag a bill with reason and suggested amount
  - Owner can review, resolve, or dismiss flags
- [ ] Dashboard charts & analytics (recharts)
  - Monthly spending trends
  - Utility category breakdown
  - Per-tenant cost history
- [ ] In-app notifications (realtime)
  - DB table + bell UI exist
  - Wire up Supabase Realtime for live updates
  - Mark as read functionality
- [ ] Admin dashboard functionality
  - Platform-wide property and user management
  - Usage analytics

---

## Phase 3 — Not Started

- [ ] Stripe payment processing
  - Subscription checkout flow
  - Webhook handling for payment events
  - Plan enforcement (property limits, tenant limits, bill limits)
- [ ] Full admin platform
  - User management (ban, role change, impersonate)
  - Property oversight and moderation
  - Platform analytics dashboard
- [ ] Landing page / marketing site
  - Feature overview, pricing, testimonials
  - CTA to sign up
- [ ] Mobile responsiveness audit
  - Test at 375px, 768px, 1280px breakpoints
  - Fix any layout issues
- [ ] Audit logging & CSV export
  - Wire up audit_log table writes on mutations
  - Export bill splits and invoices as CSV
- [ ] Performance optimization
  - Lazy loading, code splitting
  - Database query optimization
- [ ] Deployment to Vercel
  - Environment variable configuration
  - Custom domain setup
  - CI/CD pipeline

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (password + magic link) |
| File Storage | Supabase Storage (Phase 2) |
| PDF Parsing | Claude API (Phase 2) |
| Email | Resend (Phase 2) |
| Payments | Stripe (Phase 3) |
| Hosting | Vercel (Phase 3) |

---

## Seed Data: 575 McKinney

| Field | Value |
|-------|-------|
| Owner | Shekar |
| Property | 575 McKinney, McKinney, TX |
| Tenants | Anil (departed Oct 30), Navya, Vineesh, Val, Divya |
| Cycles | Sept-Oct ($504.42), Oct-Nov ($429.08) |
| Bills | 6 total (3 per cycle: Internet/Spectrum, Electricity/CoServ, Water/City of McKinney) |
| Grand Total | $933.50 |

Full data: `context/seed-data/575-mckinney-property-data.md`
SQL seed: `supabase/seed.sql`

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project coding standards for AI sessions |
| `HANDOFF.md` | Session handoff with setup steps and project state |
| `supabase/migrations/*.sql` | Database schema (run in order: 001, 002, 003, 004) |
| `supabase/seed.sql` | Demo data for 575 McKinney |
| `lib/actions/*.ts` | Server-side business logic |
| `lib/calculations/person-days.ts` | Core bill splitting algorithm |
| `middleware.ts` | Auth + role-based route protection |
| `app/(dashboard)/` | All protected dashboard routes |
