# PRD 10 — Monetization & Subscription Plans

> **Feature Area**: Tiered Subscription Plans, Limit Enforcement, Stripe Integration
> **Phase**: Phase 3 (scaffold tables and limit checking in Phase 1)
> **Priority**: Low (scaffolding: Medium)
> **Dependencies**: PRD 02 (Auth), PRD 03 (Properties), PRD 04 (Billing Cycles), PRD 09 (Admin)

---

## 1. Overview

FairSplit monetizes through tiered subscription plans that gate the number of properties, tenants per property, and bills per month an owner can manage. The Free tier enables adoption and validation, the Pro tier serves active landlords with a small portfolio, and the Business tier targets property managers with larger portfolios. Stripe handles payment processing, subscription lifecycle, and the customer billing portal. Phase 1 scaffolds the database tables and implements limit checking in server actions. Phase 3 implements the full Stripe integration and subscription management UI.

---

## 2. Goals

- Define clear, value-aligned subscription tiers that scale with usage
- Enforce plan limits at the server action level to prevent unauthorized usage
- Scaffold Stripe integration patterns for seamless Phase 3 implementation
- Provide a frictionless upgrade path when users hit plan limits
- Ensure grace periods and clear messaging rather than hard cutoffs

---

## 3. User Stories

### Plan Limits

| ID | Role | Story | Priority |
|----|------|-------|----------|
| MO-01 | Owner | I want to use the Free tier to try FairSplit with one property before committing | High |
| MO-02 | Owner | I want to see clear error messages when I hit a plan limit so I know to upgrade | High |
| MO-03 | Owner | I want to upgrade my plan when I need more properties or tenants | High |
| MO-04 | Owner | I want to downgrade my plan if I no longer need the higher tier | Medium |
| MO-05 | Owner | I want a grace period if I exceed limits due to plan changes | Medium |
| MO-06 | Tenant | My experience should not change based on the owner's subscription plan | High |

### Subscription Management

| ID | Role | Story | Priority |
|----|------|-------|----------|
| MO-07 | Owner | I want to see my current plan and usage on my settings page | High |
| MO-08 | Owner | I want to compare plan features side by side before upgrading | Medium |
| MO-09 | Owner | I want to manage my payment method and billing details | Medium |
| MO-10 | Owner | I want to view my invoice and payment history | Medium |
| MO-11 | Owner | I want to cancel my subscription and understand what happens to my data | Medium |

### Admin

| ID | Role | Story | Priority |
|----|------|-------|----------|
| MO-12 | Admin | I want to see subscription revenue metrics on the admin dashboard | Medium |
| MO-13 | Admin | I want to override a user's plan limits for special cases | Low |
| MO-14 | Admin | I want to see plan distribution across all users | Medium |

---

## 4. Subscription Tiers

### Plan Comparison

| Feature | Free | Pro ($9.99/mo) | Business ($24.99/mo) |
|---------|------|----------------|----------------------|
| Properties | 1 | 5 | Unlimited |
| Tenants per Property | 5 | 20 | Unlimited |
| Bills per Month | 10 | Unlimited | Unlimited |
| PDF Upload & AI Parsing | No | Yes | Yes |
| Invoice Generation | No | Yes | Yes |
| Email Notifications | Basic (invites only) | Full | Full |
| Priority Support | No | No | Yes |
| Custom Branding on Invoices | No | No | Yes |
| API Access | No | No | Future |

### Limit Definitions

| Limit | Free | Pro | Business | Enforcement Point |
|-------|------|-----|----------|-------------------|
| `max_properties` | 1 | 5 | -1 (unlimited) | `createProperty` server action |
| `max_tenants_per_property` | 5 | 20 | -1 (unlimited) | `inviteTenant` / `addTenant` server action |
| `max_bills_per_month` | 10 | -1 (unlimited) | -1 (unlimited) | `createBill` server action |
| `pdf_upload_enabled` | false | true | true | `uploadBillPdf` server action |
| `invoice_generation_enabled` | false | true | true | Invoice API route |

> Note: `-1` represents unlimited. All limit checks treat `-1` as "no limit."

---

## 5. Database Schema

### `subscription_plans` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Plan ID |
| `name` | `text` | NOT NULL, UNIQUE | Plan display name |
| `slug` | `text` | NOT NULL, UNIQUE | URL-safe identifier |
| `max_properties` | `integer` | NOT NULL | Max properties (-1 = unlimited) |
| `max_tenants_per_property` | `integer` | NOT NULL | Max tenants per property (-1 = unlimited) |
| `max_bills_per_month` | `integer` | NOT NULL | Max bills per calendar month (-1 = unlimited) |
| `pdf_upload_enabled` | `boolean` | NOT NULL, default `false` | AI PDF parsing access |
| `invoice_generation_enabled` | `boolean` | NOT NULL, default `false` | Invoice PDF generation |
| `price_cents` | `integer` | NOT NULL | Monthly price in cents |
| `stripe_price_id` | `text` | NULL | Stripe Price ID (populated in Phase 3) |
| `is_active` | `boolean` | NOT NULL, default `true` | Whether plan is available for new signups |
| `sort_order` | `integer` | NOT NULL, default `0` | Display order on pricing page |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last update timestamp |

### Seed Data

```sql
INSERT INTO subscription_plans (name, slug, max_properties, max_tenants_per_property, max_bills_per_month, pdf_upload_enabled, invoice_generation_enabled, price_cents, sort_order) VALUES
('Free', 'free', 1, 5, 10, false, false, 0, 1),
('Pro', 'pro', 5, 20, -1, true, true, 999, 2),
('Business', 'business', -1, -1, -1, true, true, 2499, 3);
```

### `user_subscriptions` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Subscription ID |
| `user_id` | `uuid` | FK -> profiles.id, NOT NULL, UNIQUE | One active subscription per user |
| `plan_id` | `uuid` | FK -> subscription_plans.id, NOT NULL | Current plan |
| `status` | `text` | NOT NULL, default `'active'` | Subscription status |
| `stripe_customer_id` | `text` | NULL, UNIQUE | Stripe Customer ID |
| `stripe_subscription_id` | `text` | NULL, UNIQUE | Stripe Subscription ID |
| `current_period_start` | `timestamptz` | NULL | Billing period start |
| `current_period_end` | `timestamptz` | NULL | Billing period end |
| `cancel_at_period_end` | `boolean` | NOT NULL, default `false` | Whether subscription cancels at period end |
| `grace_period_end` | `timestamptz` | NULL | Extended access after downgrade/cancel |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Subscription creation |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last update |

### Status Values

```sql
CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete'))
```

| Status | Meaning | Limit Enforcement |
|--------|---------|-------------------|
| `active` | Subscription is current and paid | Enforced per plan |
| `canceled` | User canceled; access until period end | Enforced per plan until `current_period_end` |
| `past_due` | Payment failed; Stripe retrying | Grace period (7 days), then downgrade to Free |
| `trialing` | Free trial period (future) | Enforced per trial plan |
| `incomplete` | Initial payment pending | Treated as Free tier |

### RLS Policies

| Policy | Table | Action | Rule |
|--------|-------|--------|------|
| `plans_select_all` | `subscription_plans` | SELECT | `true` (public read for pricing page) |
| `plans_manage_admin` | `subscription_plans` | INSERT, UPDATE, DELETE | `profiles.role = 'admin'` |
| `subs_select_own` | `user_subscriptions` | SELECT | `auth.uid() = user_id` |
| `subs_select_admin` | `user_subscriptions` | SELECT | `profiles.role = 'admin'` |
| `subs_manage_service` | `user_subscriptions` | INSERT, UPDATE | Via service role (webhooks) |

### Default Plan Assignment

When a new user signs up (owner role):
1. Automatically create a `user_subscriptions` record with `plan_id` = Free plan, `status` = `active`
2. No Stripe integration needed for Free tier

---

## 6. Limit Enforcement

### Server Action Pattern

Every server action that creates a limited resource must check the user's plan limits before proceeding.

```typescript
// lib/utils/plan-limits.ts

interface PlanLimits {
  maxProperties: number;
  maxTenantsPerProperty: number;
  maxBillsPerMonth: number;
  pdfUploadEnabled: boolean;
  invoiceGenerationEnabled: boolean;
}

async function getUserPlanLimits(userId: string): Promise<PlanLimits>

async function checkPropertyLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  planName: string;
}>

async function checkTenantLimit(userId: string, propertyId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  planName: string;
}>

async function checkBillLimit(userId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  planName: string;
}>

async function checkFeatureAccess(userId: string, feature: 'pdf_upload' | 'invoice_generation'): Promise<{
  allowed: boolean;
  planName: string;
}>
```

### Enforcement Points

| Server Action | Limit Check | Error Response |
|---------------|-------------|----------------|
| `createProperty` | `checkPropertyLimit(userId)` | "You've reached the maximum of {max} properties on the {planName} plan. Upgrade to add more." |
| `inviteTenant` / `addTenant` | `checkTenantLimit(userId, propertyId)` | "You've reached the maximum of {max} tenants per property on the {planName} plan." |
| `createBill` | `checkBillLimit(userId)` | "You've reached the maximum of {max} bills this month on the {planName} plan." |
| `uploadBillPdf` | `checkFeatureAccess(userId, 'pdf_upload')` | "PDF upload with AI parsing is available on Pro and Business plans." |
| Invoice API route | `checkFeatureAccess(userId, 'invoice_generation')` | "Invoice generation is available on Pro and Business plans." |

### Bill Count Calculation

- Bills per month counted by `created_at` within the current calendar month (UTC)
- Query: `SELECT COUNT(*) FROM bills WHERE owner_id = ? AND created_at >= first_day_of_month AND created_at < first_day_of_next_month`
- The owner_id is derived from the bill's cycle -> property -> owner chain

### Grace Period

- When a user downgrades from Pro/Business to Free and is over limits:
  - Existing data is NOT deleted
  - User cannot create NEW resources beyond the Free limit
  - Set `grace_period_end` to 30 days from downgrade date
  - During grace period: Show warning banner but allow read access to all data
  - After grace period: Only the most recent {limit} resources are accessible; others are hidden (not deleted)

---

## 7. Stripe Integration (Phase 3)

### Environment Variables

```
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

### Checkout Flow

1. User clicks "Upgrade to Pro" or "Upgrade to Business"
2. Server action creates a Stripe Checkout Session:
   ```typescript
   // lib/actions/subscriptions.ts
   async function createCheckoutSession(planSlug: string): Promise<{ url: string }>
   ```
3. User is redirected to Stripe Checkout
4. On success: Stripe fires `checkout.session.completed` webhook
5. Webhook handler creates/updates `user_subscriptions` record
6. User is redirected back to `/dashboard/owner/settings?subscription=success`

### Webhook Handler

- Route: `POST /api/webhooks/stripe`
- Verifies Stripe signature using `STRIPE_WEBHOOK_SECRET`
- Handles the following events:

| Stripe Event | Action |
|-------------|--------|
| `checkout.session.completed` | Create `user_subscriptions` record, set status `active` |
| `invoice.paid` | Update `current_period_start` and `current_period_end` |
| `invoice.payment_failed` | Set status to `past_due`, start grace period |
| `customer.subscription.updated` | Update plan_id, status, period dates |
| `customer.subscription.deleted` | Set status to `canceled`, start grace period, downgrade to Free after period end |

### Customer Portal

- Stripe Customer Portal for self-service management
- Server action creates a portal session:
  ```typescript
  async function createCustomerPortalSession(): Promise<{ url: string }>
  ```
- Portal allows: Update payment method, view invoices, cancel subscription
- Redirect back URL: `/dashboard/owner/settings`

### Upgrade/Downgrade

| Scenario | Stripe Behavior | FairSplit Behavior |
|----------|----------------|-------------------|
| Free -> Pro | New checkout session | Limits updated immediately on webhook |
| Free -> Business | New checkout session | Limits updated immediately on webhook |
| Pro -> Business | Stripe proration (immediate) | Limits updated on `subscription.updated` webhook |
| Business -> Pro | Stripe proration (at period end) | Limits updated at period end; grace if over limits |
| Pro/Business -> Free | Cancel via portal | Access continues until period end, then Free limits apply |

---

## 8. UI Components

### Pricing Page (Marketing)

- Route: `/pricing` (public, unauthenticated)
- Three-column plan comparison table (stacked cards on mobile)
- Each plan card:
  - Plan name and price
  - Feature list with check/x icons
  - "Get Started" (Free) / "Subscribe" (Pro/Business) CTA button
  - "Most Popular" badge on Pro plan
- FAQ section below the pricing table

### Plan & Usage Card (Owner Settings)

- Route: `/dashboard/owner/settings` (subscription section)
- Current plan name and status badge
- Usage meters:
  - Properties: Progress bar showing `{current}/{max}` (e.g., "3 of 5 properties")
  - Tenants: Per-property display if relevant
  - Bills this month: Progress bar showing `{current}/{max}`
- "Upgrade Plan" button (if not on Business)
- "Manage Billing" button (opens Stripe Customer Portal)
- "Cancel Subscription" link (if on paid plan)

### Upgrade Prompt Modal

- Triggered when a user hits a plan limit
- Displays:
  - Current plan name and the limit they hit
  - Side-by-side comparison of current plan vs next tier
  - "Upgrade Now" CTA button
  - "Maybe Later" dismiss button
- Component: `components/shared/upgrade-prompt-modal.tsx`

### Upgrade Banner

- Shown at the top of the dashboard when user is on Free plan and approaching limits (>80% usage)
- Dismissible (per session)
- "You're using 4 of 5 tenants on the Free plan. Upgrade to Pro for more."
- Component: `components/shared/upgrade-banner.tsx`

---

## 9. Admin Revenue Dashboard (Phase 3)

### Metrics Added to Admin Dashboard

| Metric | Query | Display |
|--------|-------|---------|
| Monthly Recurring Revenue | `SUM(price_cents) FROM active subscriptions` | `$1,234.56 MRR` |
| Paid Subscribers | `COUNT(*) WHERE status = 'active' AND plan != Free` | `47 paid subscribers` |
| Plan Distribution | `COUNT(*) GROUP BY plan_id` | Donut chart (Free / Pro / Business) |
| Churn Rate | Canceled last 30 days / total active | `2.3% monthly churn` |
| Revenue Growth | MRR comparison month-over-month | Line chart, last 12 months |

### Admin Plan Override

- On user detail page: "Override Plan Limits" button
- Allows admin to set custom limits for a specific user without changing their subscription
- Stored as `custom_limits` JSONB column on `user_subscriptions`
- Custom limits take precedence over plan limits when present

---

## 10. Phase 1 Scaffolding Checklist

The following items are implemented in Phase 1 to prepare for Phase 3 monetization:

- [ ] Create `subscription_plans` table with seed data (Free, Pro, Business)
- [ ] Create `user_subscriptions` table
- [ ] Auto-create Free subscription on user signup (owner role only)
- [ ] Implement `getUserPlanLimits()` utility function
- [ ] Implement `checkPropertyLimit()` and integrate into `createProperty`
- [ ] Implement `checkTenantLimit()` and integrate into tenant creation actions
- [ ] Implement `checkBillLimit()` and integrate into `createBill`
- [ ] Implement `checkFeatureAccess()` for PDF upload and invoice generation
- [ ] Display current plan and usage on owner settings page
- [ ] Show upgrade prompt modal when limits are hit
- [ ] Stripe environment variables added to `.env.example` (empty, not connected)

---

## 11. Acceptance Criteria

### Phase 1 — Scaffolding

- [ ] `subscription_plans` and `user_subscriptions` tables exist with correct schemas
- [ ] Free, Pro, and Business plans are seeded with correct limits
- [ ] New owner accounts automatically receive a Free subscription
- [ ] `createProperty` blocks when property limit is reached, showing upgrade message
- [ ] `inviteTenant`/`addTenant` blocks when tenant limit is reached per property
- [ ] `createBill` blocks when monthly bill limit is reached
- [ ] PDF upload returns feature-gated message on Free plan
- [ ] Invoice generation returns feature-gated message on Free plan
- [ ] Owner settings page shows current plan name and usage meters
- [ ] Upgrade prompt modal displays when any limit is hit

### Phase 3 — Full Integration

- [ ] Stripe Checkout session is created for Pro and Business plans
- [ ] Webhook handler processes all subscription lifecycle events correctly
- [ ] `user_subscriptions` records are updated accurately from webhook events
- [ ] Customer Portal session is created and redirects correctly
- [ ] Upgrade from Free to Pro/Business: Limits update immediately
- [ ] Downgrade: Access continues until period end, then limits apply
- [ ] Past due: Grace period of 7 days, then downgrade to Free
- [ ] Pricing page renders three plans with correct features and CTAs
- [ ] Admin dashboard shows MRR, paid subscribers, plan distribution, and churn
- [ ] Admin can override plan limits for a specific user

---

## 12. Technical Notes

- Plan limits use `-1` for unlimited to avoid NULL semantics and simplify comparison logic
- Limit checks must happen in server actions (not middleware) to prevent race conditions
- The `max_bills_per_month` check counts bills by the owner's user ID, not per property
- Stripe webhook handler must be idempotent (same event processed multiple times should have the same outcome)
- Use Stripe's `metadata` field on Checkout Sessions to pass `userId` and `planSlug` for webhook processing
- The webhook route must use `export const runtime = 'nodejs'` and raw body parsing for Stripe signature verification
- Consider using Stripe's `test clock` feature for testing subscription lifecycle in development
- Plan prices are defined in cents in the database and in Stripe; conversion to dollars is a presentation concern
- The `custom_limits` JSONB on `user_subscriptions` is optional; `getUserPlanLimits()` checks custom first, then falls back to plan defaults
- Free tier users do not have Stripe customer IDs; Stripe integration only activates on first paid checkout

---

## 13. Out of Scope

- Annual billing (monthly only in initial launch)
- Coupon codes and promotional pricing
- Referral program
- Usage-based billing (per-bill pricing)
- Multi-seat plans (one subscription = one owner)
- Free trial period for paid plans
- Grandfathered pricing for early adopters
- Cryptocurrency or alternative payment methods
- Regional pricing adjustments
- Enterprise plan with custom pricing
- In-app purchase flow (all payments through Stripe hosted pages)
