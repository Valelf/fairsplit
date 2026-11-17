# FairSplit Testing Strategy

## Overview

This document defines the testing strategy for FairSplit, covering unit tests, component tests, integration tests, and end-to-end tests. The testing approach prioritizes the person-days calculation engine (the core business logic) and critical user flows (authentication, bill creation, split viewing).

---

## Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit tests | Vitest | Pure business logic (person-days algorithm, currency formatting, date utilities) |
| Component tests | React Testing Library + Vitest | UI component behavior and rendering |
| Integration tests | Vitest + Supabase test instance | Server actions with real database queries |
| E2E tests | Playwright | Full user flows in the browser |
| Type checking | TypeScript compiler (tsc) | Static type verification |
| Linting | ESLint | Code quality and consistency |

---

## Unit Tests

### Focus Areas

Unit tests target pure functions with no external dependencies. These are the most reliable and fastest tests.

#### Person-Days Calculation Engine

The core algorithm that determines how bills are split. This must be exhaustively tested.

```typescript
// lib/calculations/person-days.ts

/**
 * Calculate person-days for each tenant within a billing period.
 *
 * Person-days = number of days a tenant was present during the bill's service period.
 * A tenant's share = their person-days / total person-days across all tenants.
 *
 * Rules:
 * - Move-in date is inclusive (tenant is charged starting on move-in day)
 * - Move-out date is inclusive (tenant is charged through move-out day)
 * - If tenant's occupancy does not overlap with bill period, person-days = 0
 * - All monetary calculations use integer cents to avoid floating-point errors
 */
```

#### Test Cases for Person-Days

```typescript
// lib/calculations/__tests__/person-days.test.ts

describe('calculatePersonDays', () => {
  // Basic scenarios
  it('should calculate equal days for tenants present the full period')
  it('should prorate for a tenant who moved in mid-period')
  it('should prorate for a tenant who moved out mid-period')
  it('should handle a tenant who moved in and out within the same period')
  it('should return 0 days for a tenant not present during the period')

  // Edge cases
  it('should handle a one-day billing period')
  it('should handle move-in on the last day of the period')
  it('should handle move-out on the first day of the period')
  it('should handle a tenant whose move-in equals move-out (single day)')
  it('should treat move-in date as inclusive')
  it('should treat move-out date as inclusive')

  // Multi-tenant scenarios
  it('should split evenly when all tenants are present for the full period')
  it('should give higher share to tenant present for more days')
  it('should handle 5 tenants with staggered move-in dates')
  it('should ensure all shares sum to exactly the bill total (no rounding loss)')

  // Currency handling
  it('should work with amounts in cents (integers)')
  it('should distribute rounding remainder to the tenant with the most person-days')
  it('should handle very small bills (e.g., 1 cent)')
  it('should handle very large bills (e.g., $10,000)')
})
```

#### Date Utility Tests

```typescript
// lib/utils/__tests__/date-utils.test.ts

describe('dateUtils', () => {
  it('should calculate days between two dates (inclusive)')
  it('should handle same start and end date as 1 day')
  it('should calculate overlap between two date ranges')
  it('should return 0 overlap for non-overlapping ranges')
  it('should handle timezone-agnostic date comparison (UTC)')
})
```

#### Currency Utility Tests

```typescript
// lib/utils/__tests__/currency-utils.test.ts

describe('currencyUtils', () => {
  it('should convert cents to dollar string: 18750 -> "$187.50"')
  it('should handle zero cents: 0 -> "$0.00"')
  it('should handle negative amounts: -500 -> "-$5.00"')
  it('should format with thousands separator: 100000 -> "$1,000.00"')
  it('should convert dollar string to cents: "$187.50" -> 18750')
  it('should handle dollar amounts without cents: "$50" -> 5000')
})
```

---

## Component Tests

### Focus Areas

Component tests verify that UI components render correctly, respond to user interactions, and display the right data.

#### BillSplitTable Tests

```typescript
// components/shared/__tests__/bill-split-table.test.tsx

describe('BillSplitTable', () => {
  it('should render a row for each tenant')
  it('should render a column for each bill plus a total column')
  it('should display dollar amounts formatted correctly')
  it('should show person-days count on hover/tooltip')
  it('should display percentage share for each cell')
  it('should show a totals row summing to bill total')
  it('should highlight the current row on hover')
  it('should show empty state when no bills exist')
})
```

#### AddBillForm Tests

```typescript
// components/owner/__tests__/add-bill-form.test.tsx

describe('AddBillForm', () => {
  it('should render all required fields')
  it('should show validation error for empty provider')
  it('should show validation error for zero or negative amount')
  it('should show validation error when start date is after end date')
  it('should call onSubmit with correct data when form is valid')
  it('should disable submit button while submitting')
  it('should show success toast after successful submission')
})
```

#### MetricCard Tests

```typescript
// components/shared/__tests__/metric-card.test.tsx

describe('MetricCard', () => {
  it('should render label and value')
  it('should render icon')
  it('should show upward trend indicator when direction is "up"')
  it('should show downward trend indicator when direction is "down"')
  it('should render skeleton when loading is true')
})
```

#### CurrencyDisplay Tests

```typescript
// components/shared/__tests__/currency-display.test.tsx

describe('CurrencyDisplay', () => {
  it('should render "$187.50" for 18750 cents')
  it('should render "$0.00" for 0 cents')
  it('should apply custom className')
  it('should show positive sign when showSign is true and amount is positive')
})
```

---

## Integration Tests

### Focus Areas

Integration tests verify that server actions interact correctly with Supabase, including RLS policy enforcement.

#### Setup

```typescript
// tests/integration/setup.ts

/**
 * Integration tests use a dedicated Supabase test project.
 * Before each test suite:
 * 1. Reset the database to a known state (run migrations + seed)
 * 2. Create test users with known credentials
 * 3. Authenticate as the appropriate role
 */
```

#### Server Action Tests

```typescript
// tests/integration/server-actions.test.ts

describe('createBill server action', () => {
  it('should create a bill when called by the property owner')
  it('should reject bill creation by a tenant')
  it('should reject bill creation by a user not associated with the property')
  it('should auto-calculate splits after bill creation')
  it('should validate bill amount is positive')
  it('should validate service period dates')
})

describe('closeCycle server action', () => {
  it('should close the cycle and notify tenants')
  it('should reject closing a cycle with no bills')
  it('should reject closing an already-closed cycle')
  it('should only allow the property owner to close a cycle')
})

describe('flagBill server action', () => {
  it('should create a flag when called by a tenant on their property')
  it('should reject flagging by a tenant not on the property')
  it('should reject flagging a bill on a cycle that is not closed')
})
```

---

## End-to-End Tests

### Focus Areas

E2E tests verify complete user flows in a real browser using Playwright.

#### Test Flows

```typescript
// tests/e2e/auth.spec.ts

test.describe('Authentication', () => {
  test('owner can sign up, verify email, and reach dashboard')
  test('owner can sign in with email and password')
  test('tenant can claim invite and create account')
  test('unauthenticated user is redirected to login')
  test('tenant cannot access owner routes')
  test('owner cannot access admin routes')
})

// tests/e2e/billing-cycle.spec.ts

test.describe('Billing Cycle', () => {
  test('owner can create a new cycle')
  test('owner can add a bill manually')
  test('owner can view auto-calculated splits')
  test('owner can close the cycle')
  test('tenant can view their share after cycle is closed')
  test('tenant can download an invoice')
  test('tenant can flag a bill')
  test('owner can resolve a flag')
})

// tests/e2e/tenant-management.spec.ts

test.describe('Tenant Management', () => {
  test('owner can add a new tenant')
  test('owner can send an invite email')
  test('owner can set a move-out date for a tenant')
  test('departed tenant can still view historical cycles')
})
```

---

## Test Data: 575 McKinney Seed Dataset

### Property

| Field | Value |
|-------|-------|
| Name | 575 McKinney Ave |
| Address | 575 McKinney Ave, Dallas, TX 75204 |
| Owner | Shekar |

### Tenants

| Name | Move-In Date | Move-Out Date | Status |
|------|-------------|---------------|--------|
| Navya | 2024-09-01 | -- | Active |
| Divya | 2024-10-10 | -- | Active |
| Anil | 2024-09-01 | 2024-12-20 | Departed |
| Priya | 2024-09-01 | -- | Active |
| Ravi | 2024-11-01 | -- | Active |

### December 2024 Cycle (Example)

**Cycle Period**: December 1-31, 2024 (31 days)

**Person-Days Calculation**:

| Tenant | Present From | Present To | Days | Person-Days |
|--------|-------------|-----------|------|-------------|
| Navya | Dec 1 | Dec 31 | 31 | 31 |
| Divya | Dec 1 | Dec 31 | 31 | 31 |
| Anil | Dec 1 | Dec 20 | 20 | 20 |
| Priya | Dec 1 | Dec 31 | 31 | 31 |
| Ravi | Dec 1 | Dec 31 | 31 | 31 |
| **Total** | | | | **144** |

**Bills**:

| Provider | Amount | Service Period |
|----------|--------|----------------|
| Electric (Oncor) | $280.00 | Dec 1-31 |
| Gas (Atmos) | $95.00 | Dec 1-31 |
| Water (Dallas Water) | $120.00 | Dec 5-Jan 4 |
| Internet (AT&T) | $89.99 | Dec 10-Jan 9 |
| Trash (City of Dallas) | $45.00 | Dec 1-31 |

### Verification Matrix

**Expected splits for December 2024 cycle (Electric bill: $280.00 = 28000 cents)**:

| Tenant | Person-Days | Share % | Amount (cents) | Amount ($) |
|--------|------------|---------|----------------|------------|
| Navya | 31 | 21.53% | 6028 | $60.28 |
| Divya | 31 | 21.53% | 6028 | $60.28 |
| Anil | 20 | 13.89% | 3889 | $38.89 |
| Priya | 31 | 21.53% | 6028 | $60.28 |
| Ravi | 31 | 21.53% | 6027 | $60.27 |
| **Total** | **144** | **100%** | **28000** | **$280.00** |

Note: Rounding remainder of 1 cent is distributed. The sum must always equal the bill total exactly.

**Full verification matrix** (all 5 bills x 5 tenants = 25 splits) should be maintained in the seed data file and verified by unit tests.

---

## Data Migration Plan

### Context

The current prototype stores billing data in localStorage. When migrating to Supabase, follow this process.

### Step 1: Export Current Data

```typescript
// scripts/export-localstorage.ts

/**
 * Run in the browser console on the current prototype:
 * 1. Read all cycles from localStorage
 * 2. Export as JSON with structure:
 *    { cycles: [...], tenants: [...], bills: [...] }
 * 3. Save to a file
 */
```

### Step 2: Transform Data

```typescript
// scripts/transform-data.ts

/**
 * Transform exported data to match the new Supabase schema:
 * 1. Convert dollar amounts to cents (multiply by 100, round to integer)
 * 2. Convert date strings to ISO 8601 format (UTC)
 * 3. Generate UUIDs for all records
 * 4. Map relationships (cycle -> bills, bill -> splits)
 * 5. Validate all transformed records against Zod schemas
 */
```

### Step 3: Run Calculation Engine

```typescript
// scripts/recalculate-splits.ts

/**
 * For each cycle in the transformed data:
 * 1. Get all tenants with their move-in/move-out dates
 * 2. For each bill, calculate person-days splits
 * 3. Populate bill_splits table
 * 4. Verify: sum of splits for each bill equals bill total
 */
```

### Step 4: Verify Totals

```typescript
// scripts/verify-migration.ts

/**
 * Compare migrated data against original localStorage data:
 * 1. For each cycle, verify total bill amounts match
 * 2. For each tenant-cycle, verify total share matches (within rounding tolerance)
 * 3. Flag any discrepancies for manual review
 * 4. Generate a migration report
 */
```

### Step 5: Load into Supabase

```bash
# Use Supabase seed or custom insert script
supabase db seed --file migration-data.sql
```

---

## Test Execution

### Running Tests

```bash
# All unit and component tests
npm run test

# Watch mode during development
npm run test:watch

# Specific test file
npx vitest run lib/calculations/__tests__/person-days.test.ts

# E2E tests (requires running dev server)
npm run test:e2e

# E2E tests in headed mode (for debugging)
npx playwright test --headed

# Type checking
npm run type-check

# Linting
npm run lint
```

### CI/CD Pipeline

Tests run automatically on every pull request:

1. TypeScript compilation check (`tsc --noEmit`)
2. ESLint (`eslint .`)
3. Unit and component tests (`vitest run`)
4. E2E tests (`playwright test`)
5. Build verification (`next build`)

All checks must pass before merging to main.

---

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| Person-days algorithm | 100% | Core business logic, must be flawless |
| Currency/date utilities | 100% | Pure functions, easy to test exhaustively |
| Server actions | 80%+ | Critical mutations, test happy paths and auth |
| UI components | 70%+ | Test behavior, not implementation details |
| E2E flows | All critical paths | Auth, bill creation, split viewing, flagging |
