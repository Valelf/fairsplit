# PRD 01: FairSplit Platform Overview

**Version:** 1.0
**Status:** Draft
**Author:** Product Team
**Last Updated:** 2026-02-08

---

## 1. Product Vision

FairSplit is a multi-tenant SaaS platform that enables fair, transparent, and automated utility bill splitting for shared housing. It eliminates the friction of manual bill division by using a person-days algorithm that accounts for partial-month occupancy, ensuring every tenant pays only for the days they were present.

## 2. Problem Statement

Manual utility bill splitting in shared housing is:

- **Error-prone:** Spreadsheet calculations are easily miscalculated, especially with mid-month move-ins and move-outs.
- **Opaque:** Tenants have no visibility into how their share was determined, leading to distrust.
- **Time-consuming:** Landlords spend hours each cycle gathering bills, computing splits, and communicating amounts.
- **Dispute-generating:** Without a clear, auditable methodology, disagreements between landlords and tenants are common.

FairSplit solves these problems by providing a structured workflow for bill entry, an auditable person-days splitting algorithm, and role-based dashboards that give each stakeholder exactly the information they need.

## 3. Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Property Owners / Landlords | Individuals or companies managing shared housing properties | Automate bill splitting, reduce disputes, save time |
| Tenants | Individuals living in shared housing | Understand their share, verify fairness, see history |
| Platform Admin | FairSplit internal team | Manage the platform, onboard users, monitor health |

## 4. User Personas

### 4.1 Admin (Platform Owner)

- **Name:** Alex, Platform Administrator
- **Role:** `admin`
- **Goals:** Monitor platform health, manage all properties and users, resolve escalated issues, configure system settings.
- **Access:** Full read/write across all properties, users, and billing data. Can impersonate any user for debugging.
- **Key Workflows:** View global dashboard, manage user accounts, review flagged bills, access audit logs.

### 4.2 Owner / Landlord

- **Name:** Jordan, Property Manager
- **Role:** `owner`
- **Goals:** Manage one or more properties, add/remove tenants, create billing cycles, enter bills, review computed splits, and share results with tenants.
- **Access:** Full CRUD on own properties, tenants, cycles, and bills. No access to other owners' data.
- **Key Workflows:** Create property, invite tenants, create billing cycle, enter bills, review splits, close cycle.
- **Pain Points:** Spending 2+ hours per month on spreadsheet calculations, fielding tenant questions about their share.

### 4.3 Tenant

- **Name:** Sam, Tenant
- **Role:** `tenant`
- **Goals:** View their bill breakdown for each cycle, understand how their share was calculated, verify the calculation is fair.
- **Access:** Read-only access to their own property's billing data (scoped by transparency settings).
- **Key Workflows:** Log in, view current cycle, see per-bill breakdown, view historical cycles.
- **Pain Points:** Not knowing how their share was calculated, suspecting unfairness.

## 5. Success Metrics

| Metric | Definition | MVP Target (6 months) |
|--------|-----------|----------------------|
| Registered Properties | Total properties with at least 1 billing cycle | 50 |
| Active Owners | Owners who created a billing cycle in the last 30 days | 30 |
| Bills Processed | Total bills entered and split | 500 |
| Tenant Engagement | % of tenants who log in to view their bills each cycle | 60% |
| Dispute Reduction | Reported billing disputes per property per month | < 0.5 |
| Time Savings | Average owner time spent on bill splitting per cycle | < 15 min |
| NPS Score | Net Promoter Score from owner surveys | > 40 |

## 6. MVP Scope (Phase 1)

### 6.1 Included in MVP

| Feature | Description |
|---------|-------------|
| Auth & Roles | Magic link authentication, role-based access (admin, owner, tenant) |
| Property CRUD | Create, read, update, delete properties with address and settings |
| Tenant Management | Add tenants (invite or pre-create), set join/leave dates, manage status |
| Billing Cycles | Create, open, and close billing cycles per property |
| Manual Bill Entry | Enter bills with category, provider, amount, and service dates |
| Person-Days Splitting | Automated fair splitting based on tenant occupancy days |
| Split Display | Matrix view showing person x bill breakdown |
| Tenant Dashboard | Read-only view for tenants to see their share per cycle |
| Seed Data | 575 McKinney property with real billing data for verification |

### 6.2 Explicitly Excluded from MVP

| Feature | Planned Phase |
|---------|---------------|
| PDF Bill Parsing (AI) | Phase 2 |
| Email Notifications | Phase 2 |
| Tenant Invoicing | Phase 2 |
| Bill Flagging & Disputes | Phase 2 |
| Stripe Billing (SaaS fees) | Phase 3 |
| Admin Impersonation | Phase 3 |
| Multi-currency Support | Phase 3 |
| Mobile Native App | Future |

## 7. Feature Prioritization

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Authentication & Authorization | Medium | Critical |
| P0 | Property CRUD | Low | Critical |
| P0 | Tenant Management | Medium | Critical |
| P0 | Billing Cycles | Medium | Critical |
| P0 | Bill Entry & Person-Days Splitting | High | Critical |
| P0 | Tenant Read-Only Dashboard | Medium | High |
| P1 | PDF Upload UI (scaffold only) | Low | Medium |
| P1 | Property Settings (transparency) | Low | Medium |
| P2 | PDF AI Parsing | High | High |
| P2 | Email Notifications | Medium | Medium |
| P3 | Stripe Integration | High | Medium |

## 8. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React framework with server components |
| Language | TypeScript | Type safety across frontend and backend |
| Styling | Tailwind CSS | Utility-first CSS framework |
| UI Components | shadcn/ui (Radix primitives) | Accessible, composable component library |
| Database | Supabase (PostgreSQL) | Managed relational database with RLS |
| Authentication | Supabase Auth | Magic link email authentication |
| File Storage | Supabase Storage | PDF bill storage |
| AI Integration | Claude API (Anthropic) | PDF bill parsing (Phase 2) |
| Deployment | Vercel | Serverless Next.js hosting |
| Payments | Stripe (Phase 3) | SaaS subscription billing |

## 9. Architecture Principles

1. **Server-first rendering:** Use React Server Components by default. Client components only for interactivity.
2. **Server actions for mutations:** All data writes go through Next.js server actions, not API routes.
3. **Row-Level Security:** Every database table has RLS policies. Never rely on client-side checks alone.
4. **Cents for money:** All monetary values stored as integers (cents) in the database. Convert to dollars only at the presentation layer.
5. **UTC for dates:** All timestamps stored in UTC. Display in property timezone at the presentation layer.
6. **Mobile-first:** All UI designed mobile-first, then enhanced for larger screens.
7. **Atomic design:** Components organized as atoms, molecules, organisms, templates, and pages.

## 10. User Stories (Epic Level)

### US-01: Platform Authentication
> As a user, I want to log in with just my email address so that I don't have to remember a password.

### US-02: Property Management
> As an owner, I want to create and manage my properties so that I can track utility bills for each one.

### US-03: Tenant Management
> As an owner, I want to add and manage tenants with their move-in and move-out dates so that bill splitting is accurate.

### US-04: Billing Cycles
> As an owner, I want to create billing cycles so that I can group bills by time period and track them systematically.

### US-05: Bill Entry & Splitting
> As an owner, I want to enter utility bills and have the system automatically calculate each tenant's fair share based on their days of occupancy.

### US-06: Tenant Bill Viewing
> As a tenant, I want to log in and see exactly what I owe and how it was calculated so that I can trust the process.

### US-07: PDF Upload (Scaffold)
> As an owner, I want to upload a bill PDF so that in the future the system can auto-extract bill details.

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Person-days algorithm edge cases | Medium | High | Comprehensive test suite with seed data verification |
| Supabase RLS complexity | Medium | High | Policy templates, thorough testing, admin escape hatch |
| Magic link email deliverability | Low | High | Custom SMTP, fallback OTP in Phase 2 |
| Tenant adoption resistance | Medium | Medium | Simple UX, no password required, clear value proposition |
| PDF parsing accuracy | Medium | Medium | Human review step, confidence scoring, manual fallback |

## 12. Open Questions

1. Should we support custom bill categories beyond the default set (internet, electricity, water, other)?
2. What is the maximum number of tenants per property we should support in MVP?
3. Should departed tenants retain access to view their historical bills?
4. Do we need an audit log for all mutations in MVP or can that wait for Phase 2?

---

*This document serves as the foundational product overview. Detailed requirements for each feature area are covered in subsequent PRDs (02-05).*
