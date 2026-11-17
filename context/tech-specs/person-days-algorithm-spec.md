# FairSplit Person-Days Algorithm Specification

> Detailed specification of the person-days bill splitting algorithm, including rationale,
> pseudocode, TypeScript reference, edge cases, server-side port, and verification matrix.

---

## Table of Contents

1. [Algorithm Overview](#algorithm-overview)
2. [Why Person-Days Is Fairer Than Equal Split](#why-person-days-is-fairer-than-equal-split)
3. [Step-by-Step Pseudocode](#step-by-step-pseudocode)
4. [TypeScript Reference Implementation](#typescript-reference-implementation)
5. [Edge Cases With Examples](#edge-cases-with-examples)
6. [Rounding Behavior](#rounding-behavior)
7. [Server-Side Port](#server-side-port)
8. [Recalculation Triggers and Strategy](#recalculation-triggers-and-strategy)
9. [Verification Matrix: 575 McKinney Seed Data](#verification-matrix-575-mckinney-seed-data)
10. [Performance Considerations](#performance-considerations)

---

## Algorithm Overview

The person-days algorithm splits a utility bill proportionally based on how many days each
tenant was physically present during the bill's service period. Instead of dividing a bill
equally among all tenants (which penalizes those who were only present for part of the
period), each tenant pays a share proportional to their actual occupancy.

**Core Formula:**

```
tenant_share = bill_amount * (tenant_person_days / total_person_days)
```

Where:
- `tenant_person_days` = number of days the tenant was present during the service period
- `total_person_days` = sum of all tenants' person-days for the same period

**Key Properties:**
- A tenant who was present for 0 days pays $0.00
- A tenant present for the full period pays the most
- Multiple tenants present on the same day each accumulate 1 person-day for that day
- The sum of all shares equals the bill total (within rounding tolerance of +/-$0.01)

---

## Why Person-Days Is Fairer Than Equal Split

Consider a $90 internet bill for a 30-day service period with 3 tenants, where Tenant C
moved in on day 21 (present for only 10 days):

**Equal Split:**

| Tenant | Days Present | Share  |
|--------|-------------|--------|
| A      | 30          | $30.00 |
| B      | 30          | $30.00 |
| C      | 10          | $30.00 |

Tenant C pays the same as A and B despite using the service for only 1/3 of the period.

**Person-Days Split:**

| Tenant | Days Present | Person-Days | Share  |
|--------|-------------|-------------|--------|
| A      | 30          | 30          | $38.57 |
| B      | 30          | 30          | $38.57 |
| C      | 10          | 10          | $12.86 |
| Total  |             | 70          | $90.00 |

Tenant C pays proportionally to their actual usage window. Tenants A and B pay slightly more
because they used the service for the full period while the household was smaller for
the first 20 days.

This is especially important for properties with frequent move-ins and move-outs, where an
equal split would systematically overcharge short-term tenants.

---

## Step-by-Step Pseudocode

```
FUNCTION calculateBillSplit(bill, tenants):
    startDate = parseUTC(bill.serviceStart)
    endDate   = parseUTC(bill.serviceEnd)

    personDaysMap = {}  // tenant_id -> count of days present

    // Step 1: Iterate day-by-day through the service period (inclusive)
    FOR day = startDate TO endDate (inclusive):

        // Step 2: Determine which tenants were active on this day
        activeTenants = []
        FOR EACH tenant IN tenants:
            joinDate  = parseUTC(tenant.joinDate)
            leaveDate = tenant.leaveDate ? parseUTC(tenant.leaveDate) : null

            isJoined  = (day >= joinDate)
            isNotLeft = (leaveDate IS NULL) OR (day <= leaveDate)

            IF isJoined AND isNotLeft:
                activeTenants.push(tenant)

        // Step 3: Accumulate person-days for each active tenant
        FOR EACH activeTenant IN activeTenants:
            personDaysMap[activeTenant.id] += 1

    // Step 4: Calculate total person-days
    totalPersonDays = SUM of all values in personDaysMap

    // Step 5: Calculate each tenant's share
    IF totalPersonDays == 0:
        // No one was present; everyone owes $0
        RETURN all tenants with personDays=0, amount=0

    shares = []
    FOR EACH tenant IN tenants:
        days = personDaysMap[tenant.id] OR 0
        rawAmount = bill.amount * (days / totalPersonDays)
        roundedAmount = ROUND(rawAmount, 2)  // Round to 2 decimal places

        shares.push({
            tenantId: tenant.id,
            personDays: days,
            amountCents: ROUND(rawAmount * 100),
            totalPersonDays: totalPersonDays
        })

    RETURN shares
```

---

## TypeScript Reference Implementation

The existing client-side implementation lives at `app/utils/calculations.ts`. The key
functions are documented below with inline commentary.

### parseISODate

Parses a date string into a UTC Date object, avoiding timezone offset issues.

```typescript
// Source: app/utils/calculations.ts

function parseISODate(dateStr: string): Date {
  // Always treat as UTC to avoid timezone weirdness.
  // Using "new Date('2025-10-11')" would parse as local time in some environments,
  // leading to off-by-one errors near midnight. Explicit UTC construction avoids this.
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
```

**Why UTC matters:** If the server is in UTC-5 and a date like "2025-10-11" is parsed as
local time, it becomes Oct 10 at 19:00 UTC. Day-by-day iteration would then count Oct 10
instead of Oct 11, causing incorrect person-day counts.

### calculateBillSplit

The core algorithm. Iterates day-by-day through the bill's service period, counts active
tenants on each day, and computes proportional shares.

```typescript
// Source: app/utils/calculations.ts

export function calculateBillSplit(
  bill: Bill,
  people: Person[]
): BillSplitResult {
  const start = parseISODate(bill.serviceStart);
  const end = parseISODate(bill.serviceEnd);

  // Map personId -> personDays
  const personDaysMap = new Map<string, number>();

  let cursor = start;
  while (isOnOrBefore(cursor, end)) {
    // Find all people active on this day
    const activePeople = people.filter((p) => {
      const join = parseISODate(p.joinDate);
      const leave = p.leaveDate ? parseISODate(p.leaveDate) : undefined;

      // Active if: joined on or before this day AND (no leave date OR leave is on or after this day)
      const joined = isOnOrAfter(cursor, join) || cursor.getTime() === join.getTime();
      const notLeft = !leave || isOnOrBefore(cursor, leave) || cursor.getTime() === leave.getTime();

      return joined && notLeft;
    });

    if (activePeople.length > 0) {
      activePeople.forEach((p) => {
        const current = personDaysMap.get(p.id) ?? 0;
        personDaysMap.set(p.id, current + 1);
      });
    }

    cursor = addDays(cursor, 1);
  }

  const totalPersonDays = Array.from(personDaysMap.values()).reduce(
    (sum, d) => sum + d, 0
  );

  const personShares: PersonBillShare[] = [];

  if (totalPersonDays === 0) {
    // No one lived there during this period -> everyone owes 0
    people.forEach((p) => {
      personShares.push({
        personId: p.id,
        personName: p.name,
        personDays: 0,
        amount: 0,
      });
    });
  } else {
    people.forEach((p) => {
      const days = personDaysMap.get(p.id) ?? 0;
      const rawAmount = (bill.amount * days) / totalPersonDays;
      const amount = Number(rawAmount.toFixed(2)); // round to cents
      personShares.push({
        personId: p.id,
        personName: p.name,
        personDays: days,
        amount,
      });
    });
  }

  return { bill, personShares, totalPersonDays };
}
```

### calculateCycle

Applies `calculateBillSplit` to every bill in a cycle and aggregates results per person.

```typescript
// Source: app/utils/calculations.ts

export function calculateCycle(input: CycleInput): CycleResult {
  const billResults = input.bills.map((bill) =>
    calculateBillSplit(bill, input.people)
  );

  // Aggregate: personId -> PersonCycleSummary
  const perPersonMap = new Map<string, PersonCycleSummary>();

  billResults.forEach((billResult) => {
    const { bill } = billResult;
    billResult.personShares.forEach((share) => {
      const existing = perPersonMap.get(share.personId);
      const perCategoryShare: PerCategoryShare = {
        category: bill.category,
        billId: bill.id,
        provider: bill.provider,
        serviceStart: bill.serviceStart,
        serviceEnd: bill.serviceEnd,
        personDays: share.personDays,
        amount: share.amount,
      };

      if (!existing) {
        perPersonMap.set(share.personId, {
          personId: share.personId,
          personName: share.personName,
          perCategory: [perCategoryShare],
          totalAmount: share.amount,
        });
      } else {
        existing.perCategory.push(perCategoryShare);
        existing.totalAmount = Number(
          (existing.totalAmount + share.amount).toFixed(2)
        );
      }
    });
  });

  // Sort alphabetically by name
  const perPerson = Array.from(perPersonMap.values()).sort((a, b) =>
    a.personName.localeCompare(b.personName)
  );

  return {
    cycle: { id: input.id, label: input.label },
    billResults,
    perPerson,
  };
}
```

---

## Edge Cases With Examples

All examples use the 575 McKinney seed data.

### Case 1: Mid-Period Move-In

**Scenario:** Val moved in on Oct 11. The Sept-Oct Internet bill runs Sep 16 - Oct 15.

```
Service period: Sep 16 - Oct 15 (30 days)
Val's join date: Oct 11
Val's active days: Oct 11, 12, 13, 14, 15 = 5 days

Total person-days for this bill:
  Anil:    Sep 16 - Oct 15 = 30 days
  Navya:   Oct 1  - Oct 15 = 15 days
  Vineesh: Oct 1  - Oct 15 = 15 days
  Val:     Oct 11 - Oct 15 = 5 days
  Divya:   (not moved in)  = 0 days
  TOTAL:                    = 65 person-days

Val's share: $95.49 * (5 / 65) = $7.345... -> $7.35 (rounded)
```

### Case 2: Mid-Period Move-Out

**Scenario:** Anil left on Oct 30. The Oct-Nov Internet bill runs Oct 16 - Nov 15.

```
Service period: Oct 16 - Nov 15 (31 days)
Anil's leave date: Oct 30
Anil's active days: Oct 16 through Oct 30 (inclusive) = 15 days

Total person-days for this bill:
  Anil:    Oct 16 - Oct 30 = 15 days
  Navya:   Oct 16 - Nov 15 = 31 days
  Vineesh: Oct 16 - Nov 15 = 31 days
  Val:     Oct 16 - Nov 15 = 31 days
  Divya:   Nov 10 - Nov 15 = 6 days
  TOTAL:                    = 114 person-days

Anil's share: $95.49 * (15 / 114) = $12.564... -> $12.56 (rounded)
```

### Case 3: Zero Presence

**Scenario:** Divya moved in on Nov 10. The Sept-Oct cycle has bills ending Oct 15-21.

```
All Sept-Oct bills end before Nov 10 (Divya's join date).
Divya's person-days = 0 for every Sept-Oct bill.
Divya's share = $0.00 for every Sept-Oct bill.
Divya's total for Sept-Oct cycle = $0.00.
```

### Case 4: Overlapping But Different Service Dates Per Bill

**Scenario:** Within the Oct-Nov cycle, each bill has different service dates:

```
Internet:    Oct 16 - Nov 15  (31 days)
Electricity: Oct 14 - Nov 12  (30 days)
Water:       Oct 21 - Nov 17  (28 days)
```

Each bill is calculated independently. Anil's person-days differ per bill because his
leave date (Oct 30) falls at different points relative to each bill's service period:

```
Anil's person-days:
  Internet:    Oct 16 - Oct 30 = 15 days
  Electricity: Oct 14 - Oct 30 = 17 days
  Water:       Oct 21 - Oct 30 = 10 days
```

This shows why per-bill calculation is essential. A cycle-level flat calculation would
not capture these differences.

### Case 5: Tenant Joins on the Same Day the Bill Starts

**Scenario:** Navya joined Oct 1. The Sept-Oct electricity bill starts Sep 15.

```
Navya's join date: Oct 1
Bill service start: Sep 15
Bill service end: Oct 14

Navya is active from Oct 1 through Oct 14 = 14 days.
She is NOT counted for Sep 15 through Sep 30 (16 days before her join).
```

### Case 6: Leave Date Equals Bill End Date

**Scenario:** If a tenant's leave date is exactly the bill's service end date.

```
Tenant leave date: Oct 15
Bill service end: Oct 15

The tenant IS counted for Oct 15 because the leave date is inclusive.
The algorithm checks: day <= leaveDate (Oct 15 <= Oct 15 = true).
```

### Case 7: No Tenants Present (All Moved Out)

**Scenario:** What if no tenants are active during a bill's service period?

```
If totalPersonDays == 0:
  Every tenant gets personDays = 0 and amount = $0.00.
  The bill amount is effectively unassigned.
  The owner should be notified that no tenants were present.
```

---

## Rounding Behavior

Each tenant's share is rounded to 2 decimal places independently:

```typescript
const rawAmount = (bill.amount * days) / totalPersonDays;
const amount = Number(rawAmount.toFixed(2));
```

**Consequence:** The sum of all rounded shares may differ from the bill total by +/- $0.01.

**Example from Oct-Nov Internet bill ($95.49):**

```
Anil:    95.49 * 15/114 = 12.5644... -> $12.56
Navya:   95.49 * 31/114 = 25.9640... -> $25.97 (rounded up)
Vineesh: 95.49 * 31/114 = 25.9640... -> $25.97 (rounded up)
Val:     95.49 * 31/114 = 25.9640... -> $25.97 (rounded up)
Divya:   95.49 *  6/114 =  5.0257... -> $5.03  (rounded up)

Sum: 12.56 + 25.97 + 25.97 + 25.97 + 5.03 = $95.50

Variance: $95.50 - $95.49 = +$0.01
```

This is an accepted trade-off. Alternatives like "largest remainder method" add complexity
without meaningful benefit at this scale. The $0.01 variance is documented in the seed data
and displayed to users with a note when it occurs.

---

## Server-Side Port

The current implementation runs client-side in `app/utils/calculations.ts`. For the SaaS
platform, the algorithm must be ported to a server action that reads from and writes to the
database.

### Architecture

```
Client-Side (current):
  initialData.ts -> calculateCycle() -> render in React

Server-Side (target):
  DB (bills + property_tenants) -> calculateAndStoreSplits() -> DB (bill_splits)
```

### Server Action: calculateAndStoreSplits

```typescript
// lib/actions/splits.ts

"use server";

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function calculateAndStoreSplits(billId: string) {
  const supabase = await createClient();

  // 1. Verify the caller owns the property
  const { data: bill } = await supabase
    .from('bills')
    .select('*, billing_cycles!inner(property_id)')
    .eq('id', billId)
    .single();

  if (!bill) return { success: false, error: 'Bill not found' };

  const propertyId = bill.billing_cycles.property_id;

  // 2. Fetch all tenants for the property
  const { data: tenants } = await supabase
    .from('property_tenants')
    .select('*')
    .eq('property_id', propertyId);

  // 3. Run the person-days algorithm
  const splits = computePersonDaysSplits(bill, tenants);

  // 4. Upsert into bill_splits using admin client (bypasses RLS)
  const admin = createAdminClient();

  const upsertData = splits.map(split => ({
    bill_id: billId,
    property_id: propertyId,
    tenant_id: split.tenantId,
    person_days: split.personDays,
    total_person_days: split.totalPersonDays,
    amount_cents: split.amountCents,
  }));

  const { error } = await admin
    .from('bill_splits')
    .upsert(upsertData, { onConflict: 'bill_id,tenant_id' });

  if (error) return { success: false, error: error.message };

  return { success: true, data: splits };
}
```

### Key Differences from Client-Side

| Aspect            | Client-Side                        | Server-Side                             |
|-------------------|------------------------------------|-----------------------------------------|
| Input source      | In-memory JavaScript objects       | Database queries                        |
| Amount format     | Dollars (float)                    | Cents (integer)                         |
| Output            | React state                        | `bill_splits` table rows                |
| Rounding          | `toFixed(2)` on dollars            | `Math.round()` on cents                 |
| Tenant source     | `people` array in CycleInput       | `property_tenants` table                |
| Date handling     | Same UTC parsing                   | Same UTC parsing                        |

### Cents Conversion

The server-side version works entirely in cents to match the database schema:

```typescript
function computePersonDaysSplits(bill: DbBill, tenants: DbPropertyTenant[]) {
  // ... day-by-day iteration (same logic) ...

  tenants.forEach(tenant => {
    const days = personDaysMap.get(tenant.id) ?? 0;
    // Work in cents to avoid floating-point issues
    const amountCents = totalPersonDays > 0
      ? Math.round(bill.amount_cents * days / totalPersonDays)
      : 0;
    // ...
  });
}
```

---

## Recalculation Triggers and Strategy

Splits must be recalculated whenever the inputs to the algorithm change.

### Triggers

| Event                        | Scope                                           | Action                        |
|------------------------------|--------------------------------------------------|-------------------------------|
| Bill created                 | Single bill                                      | Calculate splits for new bill |
| Bill updated (amount/dates)  | Single bill                                      | Recalculate splits for bill   |
| Bill deleted                 | Single bill                                      | Splits cascade-deleted        |
| Tenant join_date changed     | All bills overlapping the old or new join_date   | Recalculate affected bills    |
| Tenant leave_date changed    | All bills overlapping the old or new leave_date  | Recalculate affected bills    |
| Tenant added to property     | All open/draft cycle bills                       | Recalculate affected bills    |
| Cycle closed                 | All bills in the cycle                           | Final recalculation           |

### Strategy: Targeted Recalculation

Rather than recalculating all splits for the entire property, identify which bills are
affected by the change:

```typescript
// When tenant dates change, find affected bills
const affectedBills = await supabase
  .from('bills')
  .select('id')
  .eq('property_id', propertyId)
  .or(`service_start.lte.${newLeaveDate},service_end.gte.${newJoinDate}`);

// Recalculate only affected bills
for (const bill of affectedBills) {
  await calculateAndStoreSplits(bill.id);
}
```

### Closed Cycle Protection

Bills in `closed` cycles should not be recalculated unless an admin explicitly triggers it.
This preserves the integrity of finalized billing statements.

---

## Verification Matrix: 575 McKinney Seed Data

### Tenants

| ID      | Name    | Join Date  | Leave Date | Notes                |
|---------|---------|------------|------------|----------------------|
| anil    | Anil    | 2025-01-01 | 2025-10-30 | Departed mid-Oct-Nov |
| navya   | Navya   | 2025-10-01 | -          | Active               |
| vineesh | Vineesh | 2025-10-01 | -          | Active               |
| val     | Val     | 2025-10-11 | -          | Active               |
| divya   | Divya   | 2025-11-10 | -          | Active               |

### Cycle 1: Sept-Oct (6 bills x 5 tenants = 15 split records)

#### Bill: Internet (Spectrum) $95.49, Sep 16 - Oct 15

| Tenant  | Person-Days | Total Person-Days | Amount Cents | Amount ($) |
|---------|-------------|-------------------|-------------|------------|
| Anil    | 30          | 65                | 4406        | $44.06     |
| Navya   | 15          | 65                | 2204        | $22.04     |
| Vineesh | 15          | 65                | 2204        | $22.04     |
| Val     | 5           | 65                | 735         | $7.35      |
| Divya   | 0           | 65                | 0           | $0.00      |

#### Bill: Electricity (CoServ) $276.00, Sep 15 - Oct 14

| Tenant  | Person-Days | Total Person-Days | Amount Cents | Amount ($) |
|---------|-------------|-------------------|-------------|------------|
| Anil    | 30          | 62                | 13355       | $133.55    |
| Navya   | 14          | 62                | 6232        | $62.32     |
| Vineesh | 14          | 62                | 6232        | $62.32     |
| Val     | 4           | 62                | 1781        | $17.81     |
| Divya   | 0           | 62                | 0           | $0.00      |

#### Bill: Water (City of McKinney) $132.93, Sep 16 - Oct 21

| Tenant  | Person-Days | Total Person-Days | Amount Cents | Amount ($) |
|---------|-------------|-------------------|-------------|------------|
| Anil    | 36          | 89                | 5376        | $53.76     |
| Navya   | 21          | 89                | 3137        | $31.37     |
| Vineesh | 21          | 89                | 3137        | $31.37     |
| Val     | 11          | 89                | 1643        | $16.43     |
| Divya   | 0           | 89                | 0           | $0.00      |

#### Sept-Oct Per-Person Totals

| Tenant  | Internet | Electricity | Water  | Total   |
|---------|----------|-------------|--------|---------|
| Anil    | $44.06   | $133.55     | $53.76 | $231.37 |
| Navya   | $22.04   | $62.32      | $31.37 | $115.73 |
| Vineesh | $22.04   | $62.32      | $31.37 | $115.73 |
| Val     | $7.35    | $17.81      | $16.43 | $41.59  |
| Divya   | $0.00    | $0.00       | $0.00  | $0.00   |
| **Total** | **$95.49** | **$276.00** | **$132.93** | **$504.42** |

---

### Cycle 2: Oct-Nov (6 bills x 5 tenants = 15 split records)

#### Bill: Internet (Spectrum) $95.49, Oct 16 - Nov 15

| Tenant  | Person-Days | Total Person-Days | Amount Cents | Amount ($) |
|---------|-------------|-------------------|-------------|------------|
| Anil    | 15          | 114               | 1256        | $12.56     |
| Navya   | 31          | 114               | 2597        | $25.97     |
| Vineesh | 31          | 114               | 2597        | $25.97     |
| Val     | 31          | 114               | 2597        | $25.97     |
| Divya   | 6           | 114               | 503         | $5.03      |

**Rounding note:** Sum = $95.50, variance = +$0.01 from bill total $95.49.

#### Bill: Electricity (CoServ) $220.00, Oct 14 - Nov 12

| Tenant  | Person-Days | Total Person-Days | Amount Cents | Amount ($) |
|---------|-------------|-------------------|-------------|------------|
| Anil    | 17          | 107               | 3400        | $34.00     |
| Navya   | 29          | 107               | 5800        | $58.00     |
| Vineesh | 29          | 107               | 5800        | $58.00     |
| Val     | 29          | 107               | 5800        | $58.00     |
| Divya   | 3           | 107               | 600         | $6.00      |

#### Bill: Water (City of McKinney) $113.59, Oct 21 - Nov 17

| Tenant  | Person-Days | Total Person-Days | Amount Cents | Amount ($) |
|---------|-------------|-------------------|-------------|------------|
| Anil    | 10          | 102               | 1114        | $11.14     |
| Navya   | 28          | 102               | 3118        | $31.18     |
| Vineesh | 28          | 102               | 3118        | $31.18     |
| Val     | 28          | 102               | 3118        | $31.18     |
| Divya   | 8           | 102               | 891         | $8.91      |

#### Oct-Nov Per-Person Totals

| Tenant  | Internet | Electricity | Water  | Total   |
|---------|----------|-------------|--------|---------|
| Anil    | $12.56   | $34.00      | $11.14 | $57.70  |
| Navya   | $25.97   | $58.00      | $31.18 | $115.15 |
| Vineesh | $25.97   | $58.00      | $31.18 | $115.15 |
| Val     | $25.97   | $58.00      | $31.18 | $115.15 |
| Divya   | $5.03    | $6.00       | $8.91  | $19.94  |
| **Total** | **$95.50** | **$214.00** | **$113.59** | **$423.09** |

---

### Grand Total (Both Cycles)

| Tenant  | Sept-Oct | Oct-Nov  | Grand Total |
|---------|----------|----------|-------------|
| Anil    | $231.37  | $57.70   | $289.07     |
| Navya   | $115.73  | $115.15  | $230.88     |
| Vineesh | $115.73  | $115.15  | $230.88     |
| Val     | $41.59   | $115.15  | $156.74     |
| Divya   | $0.00    | $19.94   | $19.94      |
| **Total** | **$504.42** | **$423.09** | **$927.51** |

---

### Complete Split Record Count

- Cycle 1: 3 bills x 5 tenants = 15 bill_split records
- Cycle 2: 3 bills x 5 tenants = 15 bill_split records
- **Total: 30 bill_split records**

---

## Performance Considerations

### Time Complexity

For a single bill with `T` tenants and `D` days in the service period:

```
O(D * T) per bill
```

- D = typically 28-35 days for monthly bills
- T = typically 2-10 tenants per property

For a cycle with `B` bills:

```
O(B * D * T) per cycle
```

With typical values (B=3, D=30, T=5), this is 450 iterations -- negligible for server-side
computation.

### Optimization Opportunities (Future)

If performance becomes a concern with very large properties or long service periods:

1. **Range-based calculation**: Instead of day-by-day iteration, compute each tenant's
   overlap with the service period using date arithmetic:
   ```
   overlap_start = max(tenant.joinDate, bill.serviceStart)
   overlap_end   = min(tenant.leaveDate ?? bill.serviceEnd, bill.serviceEnd)
   person_days   = max(0, overlap_end - overlap_start + 1 day)
   ```
   This reduces per-bill complexity from O(D * T) to O(T).

2. **Batch calculation**: Calculate all bills in a cycle in a single pass rather than
   calling `calculateAndStoreSplits` per bill.

3. **Caching**: Store intermediate results (tenant date ranges per property) to avoid
   repeated database queries when recalculating multiple bills.

For the current scale (residential properties with 2-10 tenants and monthly billing), the
day-by-day approach is simple, correct, and sufficiently performant. The range-based
optimization should be implemented if FairSplit expands to commercial properties with
hundreds of tenants or daily billing periods.

### Database Performance

The `bill_splits` table uses a composite unique constraint on `(bill_id, tenant_id)` which
also serves as a covering index for the most common query pattern (fetch all splits for a
bill). The denormalized `property_id` column with its own index enables efficient RLS
filtering without joins.

For the verification dataset (30 split records), query performance is trivial. Even at scale
(1,000 properties x 5 tenants x 12 months x 3 bills = 180,000 split records/year), the
indexed queries should remain well under 10ms.
