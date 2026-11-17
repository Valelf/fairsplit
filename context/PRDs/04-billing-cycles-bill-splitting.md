# PRD 04: Billing Cycles & Bill Splitting

**Version:** 1.0
**Status:** Draft
**Author:** Product Team
**Last Updated:** 2026-02-08
**Dependencies:** PRD 01 (Platform Overview), PRD 03 (Property & Tenant Management)

---

## 1. Overview

Billing cycles and bill splitting are the core of FairSplit. Owners create cycles to group bills by time period, enter bills with service dates and amounts, and the system automatically calculates each tenant's fair share using the person-days algorithm. This algorithm accounts for partial-month occupancy, ensuring tenants only pay for the days they were present.

## 2. Goals

- Provide a clear lifecycle for billing cycles (draft, open, closed).
- Enable owners to enter bills with accurate service date ranges.
- Implement the person-days splitting algorithm with precision and transparency.
- Pre-calculate and store splits on write for fast reads.
- Handle all edge cases: mid-period moves, zero presence, overlapping dates.
- Produce verifiable results matching the existing 575 McKinney seed data.

## 3. Data Models

### 3.1 Billing Cycles Table

```sql
CREATE TABLE billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `property_id` | UUID | FK to properties.id |
| `label` | TEXT | Human-readable label (e.g., "January 2025", "Q1 2025") |
| `status` | TEXT | "draft", "open", or "closed" |
| `created_by` | UUID | FK to profiles.id, the user who created the cycle |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### 3.2 Bills Table

```sql
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_cycle_id UUID NOT NULL REFERENCES billing_cycles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL
    CHECK (category IN ('internet', 'electricity', 'water', 'gas', 'trash', 'other')),
  provider TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  service_start DATE NOT NULL,
  service_end DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'pdf_parsed')),
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `billing_cycle_id` | UUID | FK to billing_cycles.id |
| `property_id` | UUID | FK to properties.id (denormalized for RLS) |
| `category` | TEXT | Bill category |
| `provider` | TEXT | Utility provider name |
| `amount_cents` | INTEGER | Bill amount in cents (e.g., 15099 = $150.99) |
| `service_start` | DATE | First day of service period (inclusive) |
| `service_end` | DATE | Last day of service period (inclusive) |
| `source` | TEXT | How the bill was entered: "manual" or "pdf_parsed" |
| `notes` | TEXT | Optional notes about the bill |
| `pdf_url` | TEXT | URL to uploaded PDF in Supabase Storage (optional) |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### 3.3 Bill Splits Table

```sql
CREATE TABLE bill_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES property_tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  person_days INTEGER NOT NULL DEFAULT 0,
  total_person_days INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bill_id, tenant_id)
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `bill_id` | UUID | FK to bills.id |
| `tenant_id` | UUID | FK to property_tenants.id |
| `property_id` | UUID | FK to properties.id (denormalized for RLS) |
| `person_days` | INTEGER | Number of days this tenant was present during the bill's service period |
| `total_person_days` | INTEGER | Total person-days across all tenants for this bill |
| `amount_cents` | INTEGER | This tenant's share in cents |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## 4. Billing Cycle Lifecycle

### 4.1 Status Transitions

```
  [draft] --> [open] --> [closed]
     |                      |
     |______(delete)        |__(cannot revert in MVP)
```

| Status | Description | Allowed Actions |
|--------|-------------|----------------|
| `draft` | Cycle is being prepared. Bills can be added, edited, deleted. | Add/edit/delete bills, change label, open, delete cycle |
| `open` | Cycle is active. Bills can still be added and edited. Tenants can view. | Add/edit/delete bills, close cycle |
| `closed` | Cycle is finalized and locked. No further edits allowed. | View only. Owner can reopen (Phase 2). |

### 4.2 User Stories

#### US-CYCLE-01: Create Billing Cycle
> As an owner, I want to create a new billing cycle for my property so that I can group bills by time period.

**Acceptance Criteria:**
- [ ] "New Cycle" button on property's Cycles tab.
- [ ] Modal/form with field: label (required, e.g., "January 2025").
- [ ] Cycle created with status='draft'.
- [ ] Cycle appears in the Cycles tab list.
- [ ] Owner is optionally redirected to the cycle detail page.

#### US-CYCLE-02: View Billing Cycles
> As an owner, I want to see all billing cycles for a property so that I can navigate between them.

**Acceptance Criteria:**
- [ ] Cycles tab shows a list of all cycles sorted by created_at descending.
- [ ] Each cycle shows: label, status badge, bill count, total amount, created date.
- [ ] Status badges: "Draft" (blue), "Open" (green), "Closed" (gray).
- [ ] Cycles are clickable, navigating to the cycle detail page.

#### US-CYCLE-03: Open Billing Cycle
> As an owner, I want to open a billing cycle so that tenants can view it and I signal it is active.

**Acceptance Criteria:**
- [ ] "Open Cycle" action available on draft cycles.
- [ ] Status changes from 'draft' to 'open'.
- [ ] Tenants can now see the cycle and its bills (per transparency settings).
- [ ] Confirmation not required (reversible by closing or future reopen).

#### US-CYCLE-04: Close Billing Cycle
> As an owner, I want to close a billing cycle so that it is locked and finalized.

**Acceptance Criteria:**
- [ ] "Close Cycle" action available on open cycles.
- [ ] Confirmation dialog: "Closing this cycle will lock all bills and splits. Continue?"
- [ ] Status changes from 'open' to 'closed'.
- [ ] All bills and splits become read-only.
- [ ] Cycle remains visible and accessible for historical viewing.

#### US-CYCLE-05: Delete Draft Cycle
> As an owner, I want to delete a draft billing cycle so that I can remove cycles created by mistake.

**Acceptance Criteria:**
- [ ] "Delete Cycle" action available only on draft cycles.
- [ ] Confirmation dialog: "This will permanently delete the cycle and all its bills."
- [ ] Cycle and all associated bills and splits are hard-deleted.
- [ ] Not available for open or closed cycles.

## 5. Bill Management

### 5.1 User Stories

#### US-BILL-01: Add Bill to Cycle
> As an owner, I want to add a utility bill to a billing cycle so that it can be split among tenants.

**Acceptance Criteria:**
- [ ] "Add Bill" button on cycle detail page.
- [ ] Form fields: category (dropdown), provider (text), amount (currency input), service_start (date picker), service_end (date picker), notes (optional textarea).
- [ ] Amount entered in dollars (e.g., "150.99"), stored as cents (15099).
- [ ] Validation: amount > 0, service_end >= service_start, all required fields filled.
- [ ] On submit, bill is created via server action.
- [ ] **Critical:** Bill splits are calculated and stored immediately on creation.
- [ ] Bill appears in the cycle's bill list with split summary.

#### US-BILL-02: Edit Bill
> As an owner, I want to edit a bill's details so that I can correct errors.

**Acceptance Criteria:**
- [ ] Edit action available on bills in draft or open cycles.
- [ ] Pre-filled form with current bill data.
- [ ] Same validation as create.
- [ ] On save, bill is updated via server action.
- [ ] **Critical:** If amount or service dates changed, splits are recalculated.
- [ ] Not available for bills in closed cycles.

#### US-BILL-03: Delete Bill
> As an owner, I want to delete a bill from a cycle so that I can remove bills added by mistake.

**Acceptance Criteria:**
- [ ] Delete action available on bills in draft or open cycles.
- [ ] Confirmation dialog.
- [ ] Bill and all associated splits are hard-deleted.
- [ ] Not available for bills in closed cycles.

#### US-BILL-04: View Bill Detail
> As an owner, I want to see a bill's split breakdown so that I can verify the person-days calculation.

**Acceptance Criteria:**
- [ ] Bill detail view shows: category, provider, amount, service dates, source.
- [ ] Split breakdown table shows: tenant name, person-days, total person-days, percentage, amount.
- [ ] Amounts shown in dollars with 2 decimal places.
- [ ] Sum of all tenant amounts equals the bill total (or differs by at most 1 cent due to rounding).

## 6. Person-Days Algorithm

### 6.1 Definition

The person-days algorithm calculates each tenant's fair share of a bill based on the number of days they were present during the bill's service period. This accounts for mid-period move-ins and move-outs.

### 6.2 Algorithm Steps

```
FUNCTION calculateBillSplits(bill, tenants):

  INPUT:
    bill.amount_cents: Integer (total bill amount in cents)
    bill.service_start: Date (first day of service, inclusive)
    bill.service_end: Date (last day of service, inclusive)
    tenants: Array of { id, join_date, leave_date }

  STEP 1: Calculate person-days per tenant
    tenant_days = {}
    total_person_days = 0

    FOR each day FROM service_start TO service_end (inclusive):
      FOR each tenant IN tenants:
        IF tenant.join_date <= day AND (tenant.leave_date IS NULL OR tenant.leave_date >= day):
          tenant_days[tenant.id] += 1
          total_person_days += 1

  STEP 2: Calculate each tenant's share
    splits = []

    IF total_person_days == 0:
      RETURN empty splits (no tenants present)

    FOR each tenant IN tenants:
      days = tenant_days[tenant.id] OR 0
      IF days > 0:
        share_cents = ROUND(bill.amount_cents * days / total_person_days)
        splits.PUSH({
          tenant_id: tenant.id,
          person_days: days,
          total_person_days: total_person_days,
          amount_cents: share_cents
        })

  STEP 3: Rounding adjustment
    sum_of_splits = SUM(splits[*].amount_cents)
    difference = bill.amount_cents - sum_of_splits

    IF difference != 0:
      // Adjust the tenant with the most person-days by the difference
      // This ensures the total always matches exactly
      max_tenant = splits.SORT_BY(person_days, DESC).FIRST
      max_tenant.amount_cents += difference

  RETURN splits
```

### 6.3 Worked Example

**Scenario:** $150.00 internet bill, service period Jan 1 - Jan 31 (31 days). Three tenants:

| Tenant | Join Date | Leave Date | Days Present | Person-Days |
|--------|-----------|-----------|-------------|-------------|
| Alice | 2024-01-01 | null | All 31 days | 31 |
| Bob | 2024-01-01 | 2024-01-15 | 15 days | 15 |
| Carol | 2024-01-16 | null | 16 days | 16 |

**Calculation:**
- Total person-days: 31 + 15 + 16 = 62
- Alice: $150.00 * 31/62 = $75.00
- Bob: $150.00 * 15/62 = $36.29
- Carol: $150.00 * 16/62 = $38.71
- Sum: $75.00 + $36.29 + $38.71 = $150.00 (exact match)

### 6.4 Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| **Mid-period move-in** | Tenant counted only from join_date. Days before join_date excluded. |
| **Mid-period move-out** | Tenant counted up to and including leave_date. Days after excluded. |
| **Zero tenants for entire period** | No splits generated. Warning shown to owner. |
| **Single tenant for entire period** | That tenant gets 100% of the bill. |
| **Tenant joins and leaves within service period** | Counted only for the days they were present. |
| **Service period is a single day** | Normal calculation. Each present tenant gets equal share of that one day. |
| **Rounding creates 1-cent discrepancy** | Adjusted on the tenant with the most person-days. |
| **All tenants have same person-days** | Equal split (with rounding adjustment if needed). |
| **Tenant join_date after service_end** | Zero person-days, excluded from splits. |
| **Tenant leave_date before service_start** | Zero person-days, excluded from splits. |
| **Overlapping service dates across bills** | Each bill calculated independently. Overlap is fine. |

## 7. Pre-Calculation on Write

### 7.1 When Splits Are Calculated

Splits are computed and stored in the `bill_splits` table at write time, not at read time. This ensures fast page loads and consistent results.

| Trigger | Action |
|---------|--------|
| Bill created | Calculate splits for the new bill |
| Bill amount changed | Recalculate splits for this bill |
| Bill service dates changed | Recalculate splits for this bill |
| Tenant join_date changed | Recalculate splits for ALL bills in ALL cycles where the service period overlaps |
| Tenant leave_date changed | Recalculate splits for ALL bills in ALL cycles where the service period overlaps |
| Tenant added to property | Recalculate splits for ALL bills with service dates on or after the tenant's join_date |
| Tenant removed from property | Delete splits for this tenant, recalculate remaining splits for affected bills |
| Bill deleted | Delete associated splits (CASCADE) |

### 7.2 Recalculation Function

```
FUNCTION recalculateSplitsForBill(billId):
  1. Fetch bill (amount_cents, service_start, service_end, property_id)
  2. Fetch all tenants for the property (from property_tenants)
  3. Run person-days algorithm
  4. DELETE existing bill_splits WHERE bill_id = billId
  5. INSERT new bill_splits records
  6. RETURN new splits

FUNCTION recalculateSplitsForProperty(propertyId, affectedDateRange):
  1. Fetch all bills for the property where service period overlaps affectedDateRange
  2. FOR each bill: recalculateSplitsForBill(bill.id)
```

## 8. Bill Split Table UI

### 8.1 Description

The bill split table is the core display component of FairSplit. It shows a matrix of tenants (rows) by bills (columns) with person-days and amounts.

### 8.2 Matrix Layout

```
                | Internet     | Electricity  | Water        | Total
                | Jan 1-31     | Jan 5-Feb 4  | Jan 1-31     |
                | $150.00      | $200.00      | $80.00       | $430.00
----------------|--------------|--------------|--------------|--------
Alice (31 days) | $75.00       | $95.24       | $40.00       | $210.24
                | 31 pd        | 30 pd        | 31 pd        |
----------------|--------------|--------------|--------------|--------
Bob (15 days)   | $36.29       | $47.62       | $19.35       | $103.26
                | 15 pd        | 15 pd        | 15 pd        |
----------------|--------------|--------------|--------------|--------
Carol (16 days) | $38.71       | $57.14       | $20.65       | $116.50
                | 16 pd        | 16 pd        | 16 pd        |
----------------|--------------|--------------|--------------|--------
Total           | $150.00      | $200.00      | $80.00       | $430.00
```

### 8.3 User Story

#### US-SPLIT-01: View Split Table
> As an owner, I want to see a matrix showing how each bill is split among tenants so that I can verify the calculation and share it.

**Acceptance Criteria:**
- [ ] Split table displayed on the cycle detail page.
- [ ] Columns: one per bill + total column.
- [ ] Rows: one per tenant + total row.
- [ ] Each cell shows: dollar amount and person-days.
- [ ] Column headers show: category, service dates, total amount.
- [ ] Row headers show: tenant name, total days.
- [ ] Total row sums match individual bill amounts.
- [ ] Total column sums match individual tenant totals.
- [ ] Grand total (bottom-right) matches sum of all bills.
- [ ] Table is horizontally scrollable on mobile.

#### US-SPLIT-02: Tenant Views Split Table
> As a tenant, I want to see my bill breakdown for a cycle so that I understand what I owe and why.

**Acceptance Criteria:**
- [ ] Tenant dashboard shows current/most recent cycle.
- [ ] If transparency='full': tenant sees full matrix with all tenants.
- [ ] If transparency='own_share': tenant sees only their row with per-bill amounts.
- [ ] Person-days shown for transparency into the calculation.
- [ ] Total amount owed prominently displayed.

## 9. Bill Categories

| Category | Label | Icon | Color |
|----------|-------|------|-------|
| `internet` | Internet | Wifi | Blue |
| `electricity` | Electricity | Zap | Yellow |
| `water` | Water | Droplets | Cyan |
| `gas` | Gas | Flame | Orange |
| `trash` | Trash | Trash2 | Gray |
| `other` | Other | FileText | Purple |

## 10. RLS Policies

### 10.1 Billing Cycles

| Policy | Operation | Condition |
|--------|-----------|-----------|
| admin_full_access | ALL | `get_user_role() = 'admin'` |
| owner_manage_own | ALL | Property's `owner_id = auth.uid()` |
| tenant_read_own_property | SELECT | Tenant exists in `property_tenants` for this `property_id` with `user_id = auth.uid()` |

### 10.2 Bills

| Policy | Operation | Condition |
|--------|-----------|-----------|
| admin_full_access | ALL | `get_user_role() = 'admin'` |
| owner_manage_own | ALL | `property_id` belongs to owner (`owner_id = auth.uid()`) |
| tenant_read_own_property | SELECT | Tenant exists in `property_tenants` for this `property_id` with `user_id = auth.uid()` |

### 10.3 Bill Splits

| Policy | Operation | Condition |
|--------|-----------|-----------|
| admin_full_access | ALL | `get_user_role() = 'admin'` |
| owner_read_own | SELECT | `property_id` belongs to owner |
| tenant_read_own_share | SELECT | `tenant_id` matches tenant's `property_tenants.id` where `user_id = auth.uid()` |
| tenant_read_full_transparency | SELECT | Same property, transparency_level='full', tenant is active member |

## 11. Server Actions

| Action | Input | Validation | Side Effects |
|--------|-------|------------|-------------|
| `createCycle` | label, property_id | Label required, property exists | Create record |
| `updateCycleLabel` | cycle_id, label | Label required | Update record |
| `openCycle` | cycle_id | Status must be 'draft' | Update status |
| `closeCycle` | cycle_id | Status must be 'open' | Update status |
| `deleteCycle` | cycle_id | Status must be 'draft' | Delete cycle + bills + splits |
| `createBill` | Bill fields | Amount > 0, dates valid, cycle not closed | Create bill, calculate splits |
| `updateBill` | bill_id + fields | Same as create | Update bill, recalculate splits |
| `deleteBill` | bill_id | Cycle not closed | Delete bill + splits |

## 12. Verification: 575 McKinney Seed Data

### 12.1 Requirement

The person-days algorithm implementation MUST produce results identical to the current 575 McKinney app. This seed data serves as the verification suite.

### 12.2 Verification Process

```
1. Load 575 McKinney seed data (properties, tenants, cycles, bills)
2. Run person-days algorithm on each bill
3. Compare computed bill_splits with expected values from seed data
4. ALL splits must match to the cent
5. If any discrepancy: algorithm implementation is incorrect
```

### 12.3 Seed Data Location

Seed data is defined in `app/data/initialData.ts` and includes:
- Property definition (575 McKinney)
- Tenant roster with join/leave dates
- Multiple billing cycles
- Bills per cycle with amounts and service dates
- Expected split results

## 13. Technical Notes

- All monetary values are integers (cents). Conversion to dollars happens only in UI components.
- The `property_id` is denormalized on `bills` and `bill_splits` for efficient RLS policies.
- Use database transactions when creating/updating bills and their splits together.
- The rounding adjustment should be deterministic: always adjust the tenant with the most person-days (alphabetically first as tiebreaker).
- Consider adding an index on `bills(property_id, service_start, service_end)` for efficient overlap queries during recalculation.
- The split table component should be a server component that fetches data directly.

## 14. Open Questions

1. Should we allow owners to manually override a split amount (with an audit note)?
2. Should closed cycles be reopenable (Phase 2)?
3. Do we need a "recalculate all" button for owners, or is automatic recalculation sufficient?
4. Should we show a diff when splits change due to tenant date modifications?

---

*Next: PRD 05 covers PDF Upload and AI-Powered Bill Parsing.*
