# FairSplit Environment Setup Guide

## Overview

This guide covers everything needed to set up the FairSplit development environment from scratch, including prerequisites, local development configuration, database setup, and deployment.

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18.17+ (LTS recommended) | JavaScript runtime |
| npm | 9+ (included with Node.js) | Package manager |
| Git | 2.40+ | Version control |
| VS Code | Latest | Recommended editor |

### Required Accounts

| Service | Purpose | Required Phase |
|---------|---------|----------------|
| Supabase | PostgreSQL database, auth, storage | Phase 1 |
| Vercel | Deployment and hosting | Phase 1 (deployment) |
| Resend | Transactional email (invite emails, notifications) | Phase 2 |
| Anthropic | AI-powered PDF bill parsing | Phase 2 |
| Stripe | Payment processing | Phase 3 |

### Recommended VS Code Extensions

- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
- TypeScript Importer (pmneo.tsimporter)
- Supabase (supabase.supabase-vscode) -- optional but helpful

---

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/fairsplit.git
cd fairsplit
```

### 2. Install Dependencies

```bash
npm install
```

This installs all dependencies defined in `package.json`, including:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- @supabase/supabase-js
- @tanstack/react-table
- Zod (validation)
- Lucide React (icons)
- date-fns (date utilities)

### 3. Verify Installation

```bash
npx next --version  # Should show 14.x
npx tsc --version   # Should show 5.x
```

---

## Environment Variables

### Create Local Environment File

Create a `.env.local` file in the project root. This file is gitignored and contains secrets that must never be committed.

```bash
# .env.local

# ============================================
# PHASE 1: Core (Required for MVP)
# ============================================

# Supabase - Project URL (found in Supabase Dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase - Anonymous Key (safe to expose to client, RLS enforces access)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase - Service Role Key (NEVER expose to client, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# PHASE 2: Enhanced Features
# ============================================

# Resend - API Key for transactional emails (invite emails, notifications)
# RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Anthropic - API Key for AI-powered PDF bill parsing
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# ============================================
# PHASE 3: Payments
# ============================================

# Stripe - Secret Key for payment processing
# STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx

# Stripe - Webhook Secret for verifying webhook signatures
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

### Environment Variable Rules

1. **NEXT_PUBLIC_ prefix**: Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. All others are server-only.
2. **SUPABASE_SERVICE_ROLE_KEY**: This key bypasses Row Level Security. Use it ONLY in server actions and API routes, NEVER in client components.
3. **Never commit .env.local**: The `.gitignore` file already excludes it. Verify before committing.

### Verifying Environment Variables

After setting up `.env.local`, verify the variables are loaded:

```bash
npm run dev
# Visit http://localhost:3000
# Open browser console
# Check: No "missing environment variable" errors
```

---

## Supabase Project Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: fairsplit-dev (or fairsplit-prod for production)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose the closest region to your users
5. Click "Create new project" and wait for provisioning (about 2 minutes)

### 2. Get API Credentials

1. In your Supabase project, go to **Settings > API**
2. Copy the **Project URL** to `NEXT_PUBLIC_SUPABASE_URL`
3. Copy the **anon public** key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy the **service_role** key to `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run Database Migrations

Migrations create all 11 tables with their RLS policies:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-id

# Run all migrations
supabase db push
```

The migrations create the following tables:
1. `profiles` -- Extended user profiles (linked to Supabase auth.users)
2. `properties` -- Properties managed by owners
3. `property_members` -- Links users to properties with roles
4. `tenants` -- Tenant records with move-in/move-out dates
5. `billing_cycles` -- Billing cycles for a property
6. `bills` -- Individual utility bills within a cycle
7. `bill_splits` -- Calculated splits (the person-days results)
8. `flags` -- Tenant-flagged bill concerns
9. `invitations` -- Pending tenant invitations
10. `audit_log` -- Admin action audit trail
11. `notifications` -- In-app notification records

### 4. Seed Development Data

Load the 575 McKinney seed data for development and testing:

```bash
supabase db seed
```

This populates:
- One owner account (Shekar)
- One property (575 McKinney Ave)
- Five tenants with staggered move-in dates
- Three billing cycles (October, November, December 2024)
- Multiple utility bills per cycle (electric, gas, water, internet)
- Pre-calculated splits for all bill-tenant combinations

### 5. Configure Authentication

1. In Supabase Dashboard, go to **Authentication > Providers**
2. Ensure **Email** provider is enabled (it is by default)
3. Optionally enable **Google** OAuth:
   - Add Google Client ID and Secret from Google Cloud Console
   - Set redirect URL to `http://localhost:3000/auth/callback` (dev) and your production URL
4. Go to **Authentication > URL Configuration**:
   - Set Site URL to `http://localhost:3000` (dev)
   - Add redirect URLs for all environments

---

## shadcn/ui Setup

### Initial Configuration

If starting from scratch (already done in the existing project):

```bash
npx shadcn-ui@latest init
```

When prompted:
- **Style**: Default
- **Base color**: Slate
- **CSS variables**: Yes
- **Tailwind config**: tailwind.config.ts
- **Components directory**: components/ui
- **Utils directory**: lib/utils

### Adding Components

Add individual components as needed:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
# ... etc
```

Each command adds the component source code to `components/ui/`. These files are fully editable and owned by the project (not node_modules).

---

## Local Development

### Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Development Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Production build (TypeScript check + build) |
| `npm run start` | Start production server (after build) |
| `npm run lint` | Run ESLint on all files |
| `npm run type-check` | Run TypeScript compiler without emitting |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |

### Development Workflow

1. Create a feature branch: `git checkout -b feature/add-bill-form`
2. Make changes with hot reload: `npm run dev`
3. Verify TypeScript: `npm run type-check`
4. Run tests: `npm run test`
5. Commit and push: `git add . && git commit -m "feat: add bill entry form"`
6. Create pull request on GitHub

---

## Database Migrations

### Creating a New Migration

```bash
supabase migration new add_payment_status_column
```

This creates a new timestamped SQL file in `supabase/migrations/`.

### Writing Migration SQL

```sql
-- supabase/migrations/20240115120000_add_payment_status_column.sql

ALTER TABLE bill_splits
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'
CHECK (payment_status IN ('pending', 'paid', 'overdue'));

-- Update RLS policies if needed
```

### Applying Migrations

```bash
# Apply to remote Supabase project
supabase db push

# Reset local database (caution: destroys all data)
supabase db reset
```

---

## Deployment to Vercel

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import the GitHub repository
4. Vercel auto-detects Next.js

### 2. Configure Environment Variables

In Vercel project settings, add all environment variables from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Additional keys as needed per phase

### 3. Deploy

```bash
# Vercel auto-deploys on push to main
git push origin main

# Or deploy manually
npx vercel --prod
```

### 4. Post-Deployment Verification

- Verify the app loads at the Vercel URL
- Test authentication flow
- Verify Supabase connection (data loads correctly)
- Check browser console for errors

---

## Troubleshooting

### Common Issues

**Issue**: "Missing environment variable" error on startup
- **Solution**: Ensure `.env.local` exists and all required variables are set. Restart the dev server after changes.

**Issue**: Supabase connection fails
- **Solution**: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct. Check that your Supabase project is not paused (free tier pauses after 1 week of inactivity).

**Issue**: RLS policies block all queries
- **Solution**: Ensure the user is authenticated. Check that RLS policies match the expected user role. Use the Supabase Dashboard SQL editor to test queries.

**Issue**: shadcn/ui component not found
- **Solution**: Run `npx shadcn-ui@latest add <component-name>` to install it. Components are source code, not npm packages.

**Issue**: TypeScript errors after pulling new changes
- **Solution**: Run `npm install` to ensure dependencies are up to date. Run `npm run type-check` to see all errors.

**Issue**: Tailwind classes not applying
- **Solution**: Ensure the file is in a path covered by `tailwind.config.ts` content array. Restart the dev server.

**Issue**: Hot reload not working
- **Solution**: Check for syntax errors. Try stopping and restarting `npm run dev`. Clear `.next` cache folder if persistent.
