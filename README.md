# FairSplit

A multi-tenant SaaS platform for fair utility bill splitting between landlords and tenants. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Core Concept

FairSplit uses a **person-days algorithm** to split utility bills proportionally based on each tenant's actual days of occupancy during the billing period. This handles mid-month move-ins and move-outs fairly.

**Example:**
- Bill: $100 for 10 days
- Person A lives all 10 days = 10 person-days
- Person B lives 5 days = 5 person-days
- Total person-days = 15
- Person A owes: $100 x (10/15) = $66.67
- Person B owes: $100 x (5/15) = $33.33

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (19 components) |
| Database | Supabase PostgreSQL (11 tables + RLS) |
| Auth | Supabase Auth (password + magic link) |
| File Storage | Supabase Storage (Phase 2) |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts (Phase 2) |
| Tables | TanStack React Table |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

### 3. Run database migrations

In the Supabase SQL Editor, run these files in order:

1. `supabase/migrations/001_initial_schema.sql` — 11 tables + RLS policies
2. `supabase/migrations/002_seed_plans.sql` — Subscription plan definitions
3. `supabase/migrations/003_functions.sql` — Trigger functions
4. `supabase/migrations/004_fix_rls_recursion.sql` — RLS recursion fix

### 4. Create test users

```bash
npm run seed:users
```

### 5. Seed demo data

Run `supabase/seed.sql` in the Supabase SQL Editor to create the 575 McKinney demo property.

### 6. Start dev server

```bash
npm run dev
```

Open http://localhost:3000

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `SEED_ADMIN_EMAIL` (default admin@example.com) | `SEED_ADMIN_PASSWORD` (default demo123!) |
| Owner | shekar@example.com | demo123! |
| Tenant | val@example.com | demo123! |

## Project Structure

```
FairSplit/
├── app/
│   ├── (auth)/                    # Public auth routes
│   │   ├── login/                 # Password + magic link login
│   │   ├── auth/confirm/          # Auth callback handler
│   │   └── claim/[token]/         # Tenant invite claim flow
│   ├── (marketing)/               # Landing page
│   ├── (dashboard)/               # Protected role-based dashboards
│   │   └── dashboard/
│   │       ├── admin/             # Admin overview, properties, users
│   │       ├── owner/             # Property CRUD, tenants, cycles, bills
│   │       └── tenant/            # Bill viewing, settings
│   ├── api/auth/callback/         # OAuth callback
│   └── _legacy/                   # Original client-side implementation
├── components/
│   ├── ui/                        # 19 shadcn/ui primitives
│   ├── layout/                    # Sidebar, topbar, mobile nav, dashboard shell
│   └── shared/                    # Bill split table, metric cards
├── lib/
│   ├── supabase/                  # Client, server, admin clients + types
│   ├── actions/                   # Server actions (properties, tenants, cycles, bills)
│   ├── calculations/              # Person-days splitting algorithm
│   ├── hooks/                     # useUser, useToast
│   └── utils.ts                   # formatCents, formatDate, cn()
├── context/                       # 21 PRDs, tech specs, and reference docs
├── supabase/
│   ├── migrations/                # 4 SQL migration files
│   ├── seed.sql                   # 575 McKinney demo data
│   └── config.toml                # Supabase CLI config
├── scripts/                       # seed-users.ts, debug-data.ts
├── middleware.ts                   # Auth + role-based route protection
├── CLAUDE.md                      # Project coding standards for AI
└── HANDOFF.md                     # Session handoff and project state
```

## Architecture

- **Authentication**: Supabase Auth with password login (dev) and magic link (production). Middleware enforces role-based routing (admin/owner/tenant).
- **Authorization**: Row Level Security (RLS) on all 11 tables. Admin role checks use a `SECURITY DEFINER` function (`is_admin()`) to avoid RLS recursion.
- **Data model**: Amounts stored as integers (cents), converted to dollars at presentation. Dates in UTC. Bill splits pre-calculated on write, not read.
- **Server actions**: All mutations go through Next.js server actions with Zod validation. API routes reserved for file uploads, webhooks, and streaming.
- **Styling**: Tailwind CSS utility classes with shadcn/ui design tokens. Mobile-first responsive design. Dark mode support.

## Demo Data: 575 McKinney

- **Owner**: Shekar
- **Property**: 575 McKinney, McKinney, TX
- **5 tenants**: Anil (departed Oct 30), Navya, Vineesh, Val, Divya
- **2 billing cycles**: Sept-Oct ($504.42) and Oct-Nov ($429.08)
- **6 bills**: 3 per cycle (Internet, Electricity, Water)
- **Grand total**: $933.50
