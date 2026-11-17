# FairSplit User Personas

## Overview

FairSplit serves three primary roles: Admin, Owner/Landlord, and Tenant. Within the tenant role, we distinguish between active tenants, new tenants (onboarding), and departing tenants, as their needs differ significantly. These personas are based on real usage patterns at 575 McKinney, our pilot property.

---

## Persona 1: Alex — Platform Administrator

### Demographics
- **Role**: Platform Administrator
- **Age**: 28-35
- **Tech comfort**: High
- **Device usage**: Desktop primary, mobile for alerts

### Background
Alex manages the FairSplit platform day-to-day. They are responsible for ensuring system health, resolving escalated disputes, managing user accounts, and maintaining data integrity across all properties on the platform.

### Goals
- Monitor platform health metrics (active properties, cycles, users)
- Quickly respond to user support requests
- Detect and prevent fraudulent activity or data anomalies
- Ensure all properties have valid billing configurations
- Maintain high tenant satisfaction scores

### Frustrations
- Lack of visibility into individual property issues without drilling down manually
- No automated alerts when billing anomalies occur (e.g., a bill 3x higher than average)
- User support requires context-switching between multiple tools
- Difficulty tracking which disputes are resolved vs. pending

### Key Workflows
1. **Dashboard review**: Log in, check platform-wide metrics, identify properties needing attention
2. **User management**: Search users, view activity, reset passwords, deactivate accounts
3. **Dispute resolution**: Review flagged bills, examine calculation details, communicate resolution
4. **Anomaly detection**: Review bills that exceed historical averages, verify data integrity

### Scenarios
- Alex notices a property has not closed its billing cycle in 45 days and reaches out to the owner
- A tenant flags a bill as incorrect; Alex reviews the person-days calculation and confirms it is accurate
- A new owner signs up and Alex verifies their property details before activating their account

### Quote
> "I need to see the whole picture at a glance and drill into problems fast. If something is off, I want to know before the users do."

---

## Persona 2: Shekar — Owner / Landlord

### Demographics
- **Role**: Property owner managing shared housing
- **Age**: 40-55
- **Tech comfort**: Medium-high
- **Device usage**: Desktop for bill management, mobile for quick checks
- **Properties**: 575 McKinney Ave (4-bedroom shared house, 5 tenants)

### Background
Shekar owns a multi-tenant property at 575 McKinney. He manages five tenants with varying move-in dates. He currently uses spreadsheets to split utility bills but frequently makes errors and faces tenant pushback. He deals with four utility providers (electric, gas, water, internet) each with different billing cycles.

### Goals
- Split bills fairly based on actual occupancy days (person-days)
- Minimize disputes with tenants through transparent calculations
- Easily manage tenant roster (add new tenants, handle move-outs)
- Reduce time spent on monthly bill processing from hours to minutes
- Maintain a clear record of all billing history

### Frustrations
- Manual calculation errors lead to tenant distrust
- Tenants argue about fairness when someone moves in mid-cycle
- Tracking overlapping billing cycles across providers is confusing
- No single source of truth for historical billing data
- Generating individual tenant invoices is tedious

### Key Workflows
1. **Monthly billing**: Open new cycle, add bills (manual entry or PDF upload), review auto-calculated splits, notify tenants, close cycle
2. **Tenant management**: Add new tenants with move-in dates, update move-out dates for departing tenants, send invite links
3. **Review flagged bills**: When a tenant flags a bill, review the calculation, provide explanation or correct
4. **Historical review**: Look back at past cycles for reference or to resolve questions

### Scenarios
- It is the 15th of the month. Shekar receives the electric bill. He photographs it, uploads the PDF, reviews the parsed data, confirms the amount, and the system auto-splits it across tenants based on their occupancy days.
- A new tenant, Divya, moves in on the 10th. Shekar adds her with a move-in date of the 10th, and her first cycle bill is automatically prorated.
- Anil is moving out on the 20th. Shekar updates his move-out date, and the system prorates his final bills accordingly.

### Quote
> "I just want everyone to pay their fair share without me having to prove it every month. The math should speak for itself."

---

## Persona 3: Navya — Active Tenant

### Demographics
- **Role**: Active tenant at 575 McKinney
- **Age**: 25-35
- **Tech comfort**: Medium
- **Device usage**: Mobile primary, occasionally desktop
- **Residency**: Moved in 8 months ago, no plans to move out

### Background
Navya is a working professional who shares the house at 575 McKinney with four other tenants. She pays her share of utilities monthly. She has previously felt frustrated by opaque bill-splitting where she could not verify how her share was calculated.

### Goals
- Clearly understand what she owes each month and why
- Verify that the person-days calculation is fair
- Maintain a record of all past payments for her own budgeting
- Download invoices for tax or reimbursement purposes
- Flag any bills that seem incorrect

### Frustrations
- Cannot verify how her share was calculated with the current spreadsheet method
- No record of historical bills she can access independently
- Bill amounts vary month-to-month with no clear explanation
- No way to formally raise concerns about a specific bill

### Key Workflows
1. **Monthly review**: Receive notification, open dashboard, view new cycle, review each bill and her share
2. **Understand breakdown**: Click into a specific bill to see person-days calculation, who was present, how many days each
3. **Download invoice**: Generate and download a PDF invoice for the month
4. **Flag concern**: If something looks wrong, flag a specific bill with a written reason

### Scenarios
- Navya receives a notification that the December cycle is ready. She opens the app, sees her total is $187.50, and clicks into the electric bill to see that she had 31 person-days out of 145 total, giving her a 21.4% share of the $280 bill ($59.86).
- Navya notices the water bill is unusually high. She flags it with the note "Water bill seems 2x normal, was there a leak?" and Shekar investigates.

### Quote
> "I do not mind paying my share. I just want to see exactly how it was calculated so I know it is fair."

---

## Persona 4: Divya — New Tenant (Onboarding)

### Demographics
- **Role**: Newly moved-in tenant
- **Age**: 22-30
- **Tech comfort**: Medium
- **Device usage**: Mobile primary
- **Residency**: Just moved in on the 10th of the month

### Background
Divya recently moved into 575 McKinney. She has never used a utility-splitting platform before and is unfamiliar with the concept of person-days billing. Her first month will be prorated since she moved in mid-cycle.

### Goals
- Get onboarded quickly without confusion
- Understand how the billing system works (especially person-days)
- See her prorated first month bill and understand why it is less than a full month
- Feel confident that the system is fair

### Frustrations
- Confusion about what person-days means and how proration works
- Uncertainty about whether she is being charged for days before she moved in
- No onboarding guidance explaining the platform
- Unfamiliar with the property's billing history and norms

### Key Workflows
1. **Claim invite**: Receive email invite from Shekar, click the claim link, create her account
2. **View first bill**: See her first prorated bill with a clear explanation of the proration
3. **Understand proration**: Review a breakdown showing she is only charged for days she was present
4. **Explore history**: Optionally view previous cycles (read-only) to understand billing norms

### Scenarios
- Divya receives an email: "Shekar has invited you to 575 McKinney on FairSplit." She clicks the link, creates an account, and sees her dashboard.
- Her first cycle shows she owes $125.40. She clicks into the breakdown and sees: "You were present for 21 out of 31 days this cycle, so your share is prorated to 67.7% of a full share."

### Quote
> "I want to make sure I am only paying for the days I actually lived here. Show me the math."

---

## Persona 5: Anil — Departing Tenant

### Demographics
- **Role**: Tenant who has given notice and is moving out
- **Age**: 28-40
- **Tech comfort**: Medium
- **Device usage**: Mobile and desktop
- **Residency**: Lived at 575 McKinney for 14 months, moving out on the 20th

### Background
Anil has been a reliable tenant at 575 McKinney but is relocating for work. He wants to make sure his final bills are prorated correctly for his last partial month, and he wants to retain access to his historical billing records after he moves out.

### Goals
- Ensure his final month bill is prorated correctly (charged only through his move-out date)
- Download all historical invoices before losing active access
- Verify no charges appear after his move-out date
- Have a clean, dispute-free departure

### Frustrations
- Worry that final bills will not be prorated correctly
- Concern about losing access to historical records after account is deactivated
- Uncertainty about the timeline for final bill settlement
- No clear process for what happens to his account after move-out

### Key Workflows
1. **View final bill**: See the last prorated bill clearly showing charges only through the move-out date
2. **Download history**: Bulk download all historical invoices for personal records
3. **Verify proration**: Confirm the person-days calculation uses his move-out date as the end boundary
4. **Account transition**: Understand what happens to his account (read-only access vs. deactivation)

### Scenarios
- Anil's move-out date is the 20th. The December cycle runs Dec 1-31. His person-days count is 20 out of 31, and his bills are prorated accordingly.
- Before his account transitions to read-only, Anil downloads a ZIP of all his invoices from the past 14 months.
- After moving out, Anil can still log in and view his historical bills but cannot flag new concerns.

### Quote
> "I want to leave knowing everything was settled fairly. No surprises after I am gone."

---

## Persona Summary Matrix

| Attribute         | Alex (Admin) | Shekar (Owner) | Navya (Tenant) | Divya (New) | Anil (Departing) |
|-------------------|-------------|----------------|----------------|-------------|------------------|
| Tech Comfort      | High        | Medium-high    | Medium         | Medium      | Medium           |
| Primary Device    | Desktop     | Desktop/Mobile | Mobile         | Mobile      | Both             |
| Key Emotion       | Control     | Confidence     | Trust          | Clarity     | Closure          |
| Biggest Fear      | Undetected issues | Tenant disputes | Unfair charges | Being overcharged | Incorrect final bill |
| Success Metric    | Platform uptime | Zero disputes  | Verified fairness | Smooth onboarding | Clean departure |
| Interaction Freq  | Daily       | Monthly        | Monthly        | One-time + monthly | Final month      |
