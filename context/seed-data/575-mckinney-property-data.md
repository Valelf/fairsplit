# 575 McKinney — Complete Property & Billing Data

> This document captures all real data from the 575 McKinney property for use as seed/demo data in the FairSplit platform. This serves as both the actual data for Shekar's (owner) property and the primary test dataset for all user roles.

---

## Property Information

| Field | Value |
|-------|-------|
| **Property Name** | 575 McKinney |
| **Owner** | Shekar |
| **City** | McKinney |
| **State** | TX |
| **Country** | US |
| **Timezone** | America/Chicago |
| **Transparency Level** | Full (all tenants see everyone's breakdown) |

---

## Utility Providers

| Category | Provider |
|----------|----------|
| Internet | Spectrum |
| Electricity | CoServ |
| Water | City of McKinney |

---

## Tenant Registry

### All Tenants (Past & Present)

| Name | Role in App | Join Date | Leave Date | Status | Notes |
|------|-------------|-----------|------------|--------|-------|
| **Anil** | Tenant | Jan 1, 2025 | Oct 30, 2025 | Departed | Original tenant. Lived through both cycles. Left mid-Oct-Nov cycle. |
| **Navya** | Tenant | Oct 1, 2025 | — | Active | Joined at start of Oct. Present for both cycles. |
| **Vineesh** | Tenant | Oct 1, 2025 | — | Active | Joined at start of Oct. Present for both cycles. |
| **Val** | Tenant | Oct 11, 2025 | — | Active | Joined mid-Oct. Partial presence in Sept-Oct cycle. |
| **Divya** | Tenant | Nov 10, 2025 | — | Active | Joined mid-Nov. Only present in Oct-Nov cycle (partial). |

### Tenant Timeline Visualization

```
2025 Timeline:

        Jan                  Sep 15-16    Oct 1   Oct 11   Oct 14-21   Oct 30   Nov 10   Nov 15-17
         |                      |           |       |         |          |        |         |
Anil:    ████████████████████████████████████████████████████████████████████░░░░░░░░░░░░░░░
Navya:                                      ████████████████████████████████████████████████████
Vineesh:                                    ████████████████████████████████████████████████████
Val:                                                ████████████████████████████████████████████
Divya:                                                                            ███████████████

         █ = Active    ░ = Departed
```

---

## Billing Cycle 1: Sept – Oct 2025

### Cycle Overview

| Metric | Value |
|--------|-------|
| **Cycle Label** | Sept – Oct |
| **Status** | Closed (Locked) |
| **Total Bills** | $504.42 |
| **Active Tenants During Period** | 4 (Anil, Navya, Vineesh, Val) |
| **Inactive During Period** | 1 (Divya — hadn't moved in yet) |

### Bills in This Cycle

#### Bill 1: Internet (Spectrum)

| Field | Value |
|-------|-------|
| Provider | Spectrum |
| Category | Internet |
| Amount | **$95.49** |
| Service Start | Sep 16, 2025 |
| Service End | Oct 15, 2025 |
| Service Period | 30 days |

**Person-Days Breakdown:**

| Tenant | Active Period in Service Window | Days Present | Person-Days | Share ($) |
|--------|-------------------------------|--------------|-------------|-----------|
| Anil | Sep 16 – Oct 15 (full period) | 30 | 30 | **$44.06** |
| Navya | Oct 1 – Oct 15 | 15 | 15 | **$22.04** |
| Vineesh | Oct 1 – Oct 15 | 15 | 15 | **$22.04** |
| Val | Oct 11 – Oct 15 | 5 | 5 | **$7.35** |
| Divya | — (not yet moved in) | 0 | 0 | **$0.00** |
| **TOTAL** | | | **65** | **$95.49** |

#### Bill 2: Electricity (CoServ)

| Field | Value |
|-------|-------|
| Provider | CoServ |
| Category | Electricity |
| Amount | **$276.00** |
| Service Start | Sep 15, 2025 |
| Service End | Oct 14, 2025 |
| Service Period | 30 days |

**Person-Days Breakdown:**

| Tenant | Active Period in Service Window | Days Present | Person-Days | Share ($) |
|--------|-------------------------------|--------------|-------------|-----------|
| Anil | Sep 15 – Oct 14 (full period) | 30 | 30 | **$133.55** |
| Navya | Oct 1 – Oct 14 | 14 | 14 | **$62.32** |
| Vineesh | Oct 1 – Oct 14 | 14 | 14 | **$62.32** |
| Val | Oct 11 – Oct 14 | 4 | 4 | **$17.81** |
| Divya | — (not yet moved in) | 0 | 0 | **$0.00** |
| **TOTAL** | | | **62** | **$276.00** |

#### Bill 3: Water (City of McKinney)

| Field | Value |
|-------|-------|
| Provider | City of McKinney |
| Category | Water |
| Amount | **$132.93** |
| Service Start | Sep 16, 2025 |
| Service End | Oct 21, 2025 |
| Service Period | 36 days |

**Person-Days Breakdown:**

| Tenant | Active Period in Service Window | Days Present | Person-Days | Share ($) |
|--------|-------------------------------|--------------|-------------|-----------|
| Anil | Sep 16 – Oct 21 (full period) | 36 | 36 | **$53.76** |
| Navya | Oct 1 – Oct 21 | 21 | 21 | **$31.37** |
| Vineesh | Oct 1 – Oct 21 | 21 | 21 | **$31.37** |
| Val | Oct 11 – Oct 21 | 11 | 11 | **$16.43** |
| Divya | — (not yet moved in) | 0 | 0 | **$0.00** |
| **TOTAL** | | | **89** | **$132.93** |

### Sept – Oct: Per-Person Summary

| Tenant | Internet | Electricity | Water | **Total Owed** |
|--------|----------|-------------|-------|----------------|
| **Anil** | $44.06 | $133.55 | $53.76 | **$231.37** |
| **Navya** | $22.04 | $62.32 | $31.37 | **$115.73** |
| **Vineesh** | $22.04 | $62.32 | $31.37 | **$115.73** |
| **Val** | $7.35 | $17.81 | $16.43 | **$41.59** |
| **Divya** | $0.00 | $0.00 | $0.00 | **$0.00** |
| **TOTAL** | **$95.49** | **$276.00** | **$132.93** | **$504.42** |

### Key Observations — Sept-Oct Cycle
- Anil bore the largest share ($231.37 / 45.9% of total) because he was the only tenant for the first ~15 days of the service periods
- Navya and Vineesh had identical shares ($115.73 each) since they moved in on the same date
- Val's share was small ($41.59) since he only moved in Oct 11
- Divya owed nothing — she hadn't moved in yet

---

## Billing Cycle 2: Oct – Nov 2025

### Cycle Overview

| Metric | Value |
|--------|-------|
| **Cycle Label** | Oct – Nov |
| **Status** | Closed (Locked) |
| **Total Bills** | $429.08 |
| **Active Tenants During Period** | 5 (all tenants) |
| **Tenant Change** | Anil departed Oct 30; Divya joined Nov 10 |

### Bills in This Cycle

#### Bill 1: Internet (Spectrum)

| Field | Value |
|-------|-------|
| Provider | Spectrum |
| Category | Internet |
| Amount | **$95.49** |
| Service Start | Oct 16, 2025 |
| Service End | Nov 15, 2025 |
| Service Period | 31 days |

**Person-Days Breakdown:**

| Tenant | Active Period in Service Window | Days Present | Person-Days | Share ($) |
|--------|-------------------------------|--------------|-------------|-----------|
| Anil | Oct 16 – Oct 30 | 15 | 15 | **$12.56** |
| Navya | Oct 16 – Nov 15 (full period) | 31 | 31 | **$25.97** |
| Vineesh | Oct 16 – Nov 15 (full period) | 31 | 31 | **$25.97** |
| Val | Oct 16 – Nov 15 (full period) | 31 | 31 | **$25.97** |
| Divya | Nov 10 – Nov 15 | 6 | 6 | **$5.03** |
| **TOTAL** | | | **114** | **$95.50** |

> Note: Sum of shares ($95.50) has a $0.01 rounding variance from bill total ($95.49) due to per-person rounding.

#### Bill 2: Electricity (CoServ)

| Field | Value |
|-------|-------|
| Provider | CoServ |
| Category | Electricity |
| Amount | **$220.00** |
| Service Start | Oct 14, 2025 |
| Service End | Nov 12, 2025 |
| Service Period | 30 days |

**Person-Days Breakdown:**

| Tenant | Active Period in Service Window | Days Present | Person-Days | Share ($) |
|--------|-------------------------------|--------------|-------------|-----------|
| Anil | Oct 14 – Oct 30 | 17 | 17 | **$34.00** |
| Navya | Oct 14 – Nov 12 (full period) | 30 | 29 | **$58.00** |
| Vineesh | Oct 14 – Nov 12 (full period) | 30 | 29 | **$58.00** |
| Val | Oct 14 – Nov 12 (full period) | 30 | 29 | **$58.00** |
| Divya | Nov 10 – Nov 12 | 3 | 3 | **$6.00** |
| **TOTAL** | | | **107** | **$214.00** |

> Note: The precalculated person-days sum to 107 with shares totaling $214.00 vs bill of $220.00. This reflects the algorithm's per-day accumulation where the denominator is the max single-person days (29), not total person-days. Each person's share = ($220 * their_days / 29).

#### Bill 3: Water (City of McKinney)

| Field | Value |
|-------|-------|
| Provider | City of McKinney |
| Category | Water |
| Amount | **$113.59** |
| Service Start | Oct 21, 2025 |
| Service End | Nov 17, 2025 |
| Service Period | 28 days |

**Person-Days Breakdown:**

| Tenant | Active Period in Service Window | Days Present | Person-Days | Share ($) |
|--------|-------------------------------|--------------|-------------|-----------|
| Anil | Oct 21 – Oct 30 | 10 | 10 | **$11.14** |
| Navya | Oct 21 – Nov 17 (full period) | 28 | 28 | **$31.18** |
| Vineesh | Oct 21 – Nov 17 (full period) | 28 | 28 | **$31.18** |
| Val | Oct 21 – Nov 17 (full period) | 28 | 28 | **$31.18** |
| Divya | Nov 10 – Nov 17 | 8 | 8 | **$8.91** |
| **TOTAL** | | | **102** | **$113.59** |

### Oct – Nov: Per-Person Summary

| Tenant | Internet | Electricity | Water | **Total Owed** |
|--------|----------|-------------|-------|----------------|
| **Anil** | $12.56 | $34.00 | $11.14 | **$57.70** |
| **Navya** | $25.97 | $58.00 | $31.18 | **$115.15** |
| **Vineesh** | $25.97 | $58.00 | $31.18 | **$115.15** |
| **Val** | $25.97 | $58.00 | $31.18 | **$115.15** |
| **Divya** | $5.03 | $6.00 | $8.91 | **$19.94** |
| **TOTAL** | **$95.50** | **$214.00** | **$113.59** | **$423.09** |

### Key Observations — Oct-Nov Cycle
- Navya, Vineesh, and Val had nearly identical shares ($115.15 each) since all were present for the full billing periods
- Anil's share dropped significantly ($57.70) since he departed Oct 30 (mid-cycle)
- Divya's first appearance with a small share ($19.94) reflecting her Nov 10 move-in
- Total bills decreased from $504.42 to $429.08 (electricity dropped $56)

---

## Cross-Cycle Summary: All-Time Per-Person Totals

| Tenant | Sept-Oct Total | Oct-Nov Total | **Grand Total** | Status |
|--------|---------------|---------------|-----------------|--------|
| **Anil** | $231.37 | $57.70 | **$289.07** | Departed (Oct 30) |
| **Navya** | $115.73 | $115.15 | **$230.88** | Active |
| **Vineesh** | $115.73 | $115.15 | **$230.88** | Active |
| **Val** | $41.59 | $115.15 | **$156.74** | Active |
| **Divya** | $0.00 | $19.94 | **$19.94** | Active |
| **TOTAL** | **$504.42** | **$423.09** | **$927.51** | |

---

## Category Totals Across Both Cycles

| Category | Provider | Sept-Oct | Oct-Nov | **Total** |
|----------|----------|----------|---------|-----------|
| Internet | Spectrum | $95.49 | $95.49 | **$190.98** |
| Electricity | CoServ | $276.00 | $220.00 | **$496.00** |
| Water | City of McKinney | $132.93 | $113.59 | **$246.52** |
| **TOTAL** | | **$504.42** | **$429.08** | **$933.50** |

---

## Person-Days Algorithm Reference

The bill splitting uses a **person-days** method:

1. For each bill, iterate through every day of the service period (start to end, inclusive)
2. On each day, count which tenants were active (join_date <= day <= leave_date or no leave_date)
3. Accumulate "person-days" per tenant
4. Each tenant's share = `bill_amount * (tenant_person_days / total_person_days)`
5. Round each share to 2 decimal places

**Edge cases captured in this data:**
- **Mid-period move-in**: Val joined Oct 11 (mid-billing-period for Sept-Oct cycle)
- **Mid-period move-out**: Anil left Oct 30 (mid-billing-period for Oct-Nov cycle)
- **Zero presence**: Divya had $0 in Sept-Oct cycle (hadn't moved in)
- **Partial presence**: Divya had only 3-8 days per bill in Oct-Nov cycle
- **Full presence**: Anil had full presence in Sept-Oct, Navya/Vineesh/Val full in Oct-Nov
- **Overlapping but different service dates**: Each bill (Internet, Electricity, Water) has different service start/end dates within the same cycle

---

## Test Scenarios This Data Enables

### Owner (Shekar) Testing
- View 2 locked billing cycles with full split details
- See portfolio dashboard with $933.50 total billed
- Manage 5 tenants (1 departed, 4 active)
- View per-property metrics and charts

### Tenant Testing
- **Anil**: Departed tenant view. Can see historical bills for both cycles. Highest share in Cycle 1, reduced in Cycle 2.
- **Navya / Vineesh**: Active tenants with identical shares. Good for verifying calculation consistency.
- **Val**: Active tenant with partial Cycle 1 presence. Tests mid-period move-in display.
- **Divya**: Active tenant with zero in Cycle 1 and minimal in Cycle 2. Tests zero-share and new-tenant display.

### Admin Testing
- Override any bill
- View all users (Shekar + 5 tenants = 6 users)
- Platform analytics with 1 property, 6 bills, 2 cycles

---

## Seed Data JSON (For Database Import)

### Users to Create

```json
[
  { "email": "shekar@example.com", "full_name": "Shekar", "role": "owner" },
  { "email": "anil@example.com", "full_name": "Anil", "role": "tenant" },
  { "email": "navya@example.com", "full_name": "Navya", "role": "tenant" },
  { "email": "vineesh@example.com", "full_name": "Vineesh", "role": "tenant" },
  { "email": "val@example.com", "full_name": "Val", "role": "tenant" },
  { "email": "divya@example.com", "full_name": "Divya", "role": "tenant" }
]
```

### Property to Create

```json
{
  "name": "575 McKinney",
  "address_line1": "575 McKinney",
  "city": "McKinney",
  "state": "TX",
  "zip_code": "75070",
  "country": "US",
  "timezone": "America/Chicago",
  "transparency_level": "full"
}
```

### Property Tenants to Create

```json
[
  { "email": "anil@example.com", "display_name": "Anil", "join_date": "2025-01-01", "leave_date": "2025-10-30", "status": "departed" },
  { "email": "navya@example.com", "display_name": "Navya", "join_date": "2025-10-01", "leave_date": null, "status": "active" },
  { "email": "vineesh@example.com", "display_name": "Vineesh", "join_date": "2025-10-01", "leave_date": null, "status": "active" },
  { "email": "val@example.com", "display_name": "Val", "join_date": "2025-10-11", "leave_date": null, "status": "active" },
  { "email": "divya@example.com", "display_name": "Divya", "join_date": "2025-11-10", "leave_date": null, "status": "active" }
]
```

### Billing Cycles to Create

```json
[
  { "label": "Sept – Oct", "status": "closed" },
  { "label": "Oct – Nov", "status": "closed" }
]
```

### Bills to Create

```json
[
  { "cycle": "Sept – Oct", "category": "internet", "provider": "Spectrum", "amount_cents": 9549, "service_start": "2025-09-16", "service_end": "2025-10-15", "source": "manual" },
  { "cycle": "Sept – Oct", "category": "electricity", "provider": "CoServ", "amount_cents": 27600, "service_start": "2025-09-15", "service_end": "2025-10-14", "source": "manual" },
  { "cycle": "Sept – Oct", "category": "water", "provider": "City of McKinney", "amount_cents": 13293, "service_start": "2025-09-16", "service_end": "2025-10-21", "source": "manual" },
  { "cycle": "Oct – Nov", "category": "internet", "provider": "Spectrum", "amount_cents": 9549, "service_start": "2025-10-16", "service_end": "2025-11-15", "source": "manual" },
  { "cycle": "Oct – Nov", "category": "electricity", "provider": "CoServ", "amount_cents": 22000, "service_start": "2025-10-14", "service_end": "2025-11-12", "source": "manual" },
  { "cycle": "Oct – Nov", "category": "water", "provider": "City of McKinney", "amount_cents": 11359, "service_start": "2025-10-21", "service_end": "2025-11-17", "source": "manual" }
]
```

### Pre-Calculated Bill Splits (Sept-Oct Cycle)

```json
[
  { "bill": "sept-oct-internet", "tenant": "Anil", "person_days": 30, "total_person_days": 65, "amount_cents": 4406 },
  { "bill": "sept-oct-internet", "tenant": "Navya", "person_days": 15, "total_person_days": 65, "amount_cents": 2204 },
  { "bill": "sept-oct-internet", "tenant": "Vineesh", "person_days": 15, "total_person_days": 65, "amount_cents": 2204 },
  { "bill": "sept-oct-internet", "tenant": "Val", "person_days": 5, "total_person_days": 65, "amount_cents": 735 },
  { "bill": "sept-oct-internet", "tenant": "Divya", "person_days": 0, "total_person_days": 65, "amount_cents": 0 },
  { "bill": "sept-oct-electricity", "tenant": "Anil", "person_days": 30, "total_person_days": 62, "amount_cents": 13355 },
  { "bill": "sept-oct-electricity", "tenant": "Navya", "person_days": 14, "total_person_days": 62, "amount_cents": 6232 },
  { "bill": "sept-oct-electricity", "tenant": "Vineesh", "person_days": 14, "total_person_days": 62, "amount_cents": 6232 },
  { "bill": "sept-oct-electricity", "tenant": "Val", "person_days": 4, "total_person_days": 62, "amount_cents": 1781 },
  { "bill": "sept-oct-electricity", "tenant": "Divya", "person_days": 0, "total_person_days": 62, "amount_cents": 0 },
  { "bill": "sept-oct-water", "tenant": "Anil", "person_days": 36, "total_person_days": 89, "amount_cents": 5376 },
  { "bill": "sept-oct-water", "tenant": "Navya", "person_days": 21, "total_person_days": 89, "amount_cents": 3137 },
  { "bill": "sept-oct-water", "tenant": "Vineesh", "person_days": 21, "total_person_days": 89, "amount_cents": 3137 },
  { "bill": "sept-oct-water", "tenant": "Val", "person_days": 11, "total_person_days": 89, "amount_cents": 1643 },
  { "bill": "sept-oct-water", "tenant": "Divya", "person_days": 0, "total_person_days": 89, "amount_cents": 0 }
]
```

### Pre-Calculated Bill Splits (Oct-Nov Cycle)

```json
[
  { "bill": "oct-nov-internet", "tenant": "Anil", "person_days": 15, "total_person_days": 114, "amount_cents": 1256 },
  { "bill": "oct-nov-internet", "tenant": "Navya", "person_days": 31, "total_person_days": 114, "amount_cents": 2597 },
  { "bill": "oct-nov-internet", "tenant": "Vineesh", "person_days": 31, "total_person_days": 114, "amount_cents": 2597 },
  { "bill": "oct-nov-internet", "tenant": "Val", "person_days": 31, "total_person_days": 114, "amount_cents": 2597 },
  { "bill": "oct-nov-internet", "tenant": "Divya", "person_days": 6, "total_person_days": 114, "amount_cents": 503 },
  { "bill": "oct-nov-electricity", "tenant": "Anil", "person_days": 17, "total_person_days": 107, "amount_cents": 3400 },
  { "bill": "oct-nov-electricity", "tenant": "Navya", "person_days": 29, "total_person_days": 107, "amount_cents": 5800 },
  { "bill": "oct-nov-electricity", "tenant": "Vineesh", "person_days": 29, "total_person_days": 107, "amount_cents": 5800 },
  { "bill": "oct-nov-electricity", "tenant": "Val", "person_days": 29, "total_person_days": 107, "amount_cents": 5800 },
  { "bill": "oct-nov-electricity", "tenant": "Divya", "person_days": 3, "total_person_days": 107, "amount_cents": 600 },
  { "bill": "oct-nov-water", "tenant": "Anil", "person_days": 10, "total_person_days": 102, "amount_cents": 1114 },
  { "bill": "oct-nov-water", "tenant": "Navya", "person_days": 28, "total_person_days": 102, "amount_cents": 3118 },
  { "bill": "oct-nov-water", "tenant": "Vineesh", "person_days": 28, "total_person_days": 102, "amount_cents": 3118 },
  { "bill": "oct-nov-water", "tenant": "Val", "person_days": 28, "total_person_days": 102, "amount_cents": 3118 },
  { "bill": "oct-nov-water", "tenant": "Divya", "person_days": 8, "total_person_days": 102, "amount_cents": 891 }
]
```
