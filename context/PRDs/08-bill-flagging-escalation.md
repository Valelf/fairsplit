# PRD 08 — Bill Flagging & Escalation

> **Feature Area**: Tenant Bill Disputes & Owner Resolution Workflow
> **Phase**: Phase 2
> **Priority**: Medium
> **Dependencies**: PRD 04 (Billing Cycles & Bill Splitting), PRD 06 (Notifications)

---

## 1. Overview

Tenants need a mechanism to dispute or question bills they believe are incorrect. The bill flagging system provides a structured workflow where tenants submit flags with reasons and optional suggested amounts, owners review and resolve flags, and the system automatically recalculates splits when adjustments are accepted. This creates an auditable dispute trail that builds trust in the platform.

---

## 2. Goals

- Give tenants a clear, low-friction way to question or dispute a bill
- Give owners a centralized view of all flags with tools to review and resolve them
- Automatically recalculate bill splits when an adjustment is accepted
- Maintain a full audit trail of flag submissions, reviews, and resolutions
- Keep both parties informed via in-app notifications at each stage

---

## 3. User Stories

### Tenant — Flag Submission

| ID | Role | Story | Priority |
|----|------|-------|----------|
| FL-01 | Tenant | I want to flag a bill that I think is incorrect so the owner can review it | High |
| FL-02 | Tenant | I want to provide a reason for my flag so the owner understands my concern | High |
| FL-03 | Tenant | I want to optionally suggest what I think the correct amount should be | Medium |
| FL-04 | Tenant | I want to see the status of my submitted flags so I know if they are being reviewed | High |
| FL-05 | Tenant | I want to receive a notification when my flag is resolved or dismissed | High |
| FL-06 | Tenant | I want to see a flag indicator on bills I have flagged | Medium |
| FL-07 | Tenant | I want to see the resolution note when my flag is resolved or dismissed | Medium |
| FL-08 | Tenant | I want to flag bills in both open and closed cycles | Medium |

### Owner — Flag Review

| ID | Role | Story | Priority |
|----|------|-------|----------|
| FL-09 | Owner | I want to see all flags for my property in one place, grouped by status | High |
| FL-10 | Owner | I want to receive a notification when a tenant submits a flag | High |
| FL-11 | Owner | I want to mark a flag as "under review" to signal that I am looking into it | Medium |
| FL-12 | Owner | I want to resolve a flag by accepting the suggested adjustment and updating the bill | High |
| FL-13 | Owner | I want to dismiss a flag with a note explaining why | High |
| FL-14 | Owner | I want to resolve a flag with a custom amount (different from the tenant's suggestion) | Medium |
| FL-15 | Owner | I want the bill splits to automatically recalculate when I accept an adjustment | High |
| FL-16 | Owner | I want to see the flag history for any bill to understand past disputes | Medium |

---

## 4. Database Schema

### `bill_flags` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Unique flag ID |
| `bill_id` | `uuid` | FK -> bills.id, NOT NULL | The flagged bill |
| `tenant_id` | `uuid` | FK -> profiles.id, NOT NULL | Tenant who submitted the flag |
| `property_id` | `uuid` | FK -> properties.id, NOT NULL | Denormalized for RLS |
| `reason` | `text` | NOT NULL, min 10 chars | Explanation of the dispute |
| `suggested_amount_cents` | `integer` | NULL, CHECK >= 0 | Tenant's suggested correct amount (optional) |
| `status` | `text` | NOT NULL, default `'open'` | Current flag status |
| `resolution_note` | `text` | NULL | Owner's note on resolution or dismissal |
| `resolved_amount_cents` | `integer` | NULL, CHECK >= 0 | Actual adjusted amount (if different from suggestion) |
| `resolved_by` | `uuid` | FK -> profiles.id, NULL | User who resolved the flag |
| `resolved_at` | `timestamptz` | NULL | When the flag was resolved |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | When the flag was submitted |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last update timestamp |

### Status Values

```sql
CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed'))
```

| Status | Meaning | Set By |
|--------|---------|--------|
| `open` | Newly submitted, awaiting owner review | System (on creation) |
| `under_review` | Owner has acknowledged and is investigating | Owner |
| `resolved` | Owner accepted adjustment; bill amount updated | Owner |
| `dismissed` | Owner rejected the flag with explanation | Owner |

### RLS Policies

| Policy | Action | Rule |
|--------|--------|------|
| `flags_select_tenant` | SELECT | `auth.uid() = tenant_id` |
| `flags_select_owner` | SELECT | `property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())` |
| `flags_insert_tenant` | INSERT | `auth.uid() = tenant_id AND tenant is member of property` |
| `flags_update_owner` | UPDATE | `property_id IN (SELECT id FROM properties WHERE owner_id = auth.uid())` |
| `flags_admin_all` | ALL | `profiles.role = 'admin'` |

### Indexes

```sql
CREATE INDEX idx_bill_flags_bill ON bill_flags (bill_id);
CREATE INDEX idx_bill_flags_property_status ON bill_flags (property_id, status);
CREATE INDEX idx_bill_flags_tenant ON bill_flags (tenant_id, created_at DESC);
```

### Constraints

- A tenant can only have one open or under_review flag per bill at a time (unique partial index):

```sql
CREATE UNIQUE INDEX idx_bill_flags_unique_active
ON bill_flags (bill_id, tenant_id)
WHERE status IN ('open', 'under_review');
```

---

## 5. Flag Submission Flow (Tenant)

### Entry Points

1. **Bill row action**: Flag icon button on each bill row in the tenant bills view
2. **Bill detail**: "Flag this bill" button on the bill detail card
3. Both entry points open the same flag submission form

### Flag Form

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| Bill | Pre-selected (read-only display) | Valid bill ID | Yes |
| Reason | Textarea | Min 10 characters, max 1000 characters | Yes |
| Suggested Amount | Currency input | Must be >= $0.00, stored as cents | No |

### Form Component

```
components/tenant/bill-flag-form.tsx
```

- Uses `react-hook-form` with Zod validation
- Displays the bill details (category, provider, amount, service dates) above the form for context
- "Submit Flag" button with loading state
- Success toast: "Flag submitted. The property owner has been notified."
- Error handling: Displays validation errors inline, server errors as toast

### Submission Server Action

```typescript
// lib/actions/flags.ts
async function submitFlag(data: {
  billId: string;
  reason: string;
  suggestedAmountCents?: number;
}): Promise<{ success: boolean; flagId?: string; error?: string }>
```

**Steps:**
1. Validate input with Zod
2. Verify tenant is a member of the bill's property
3. Check no existing open/under_review flag exists for this bill + tenant
4. Insert `bill_flags` record with status `open`
5. Create notification for property owner (type: `flag_submitted`)
6. Send email to owner (Phase 2)
7. Return success with flag ID

---

## 6. Flag Review Flow (Owner)

### Flags Tab — Property Detail Page

- Route: `/dashboard/owner/properties/[propertyId]/flags`
- Tab in the property detail page navigation alongside Overview, Bills, Tenants, Cycles, Settings

### Flags View Layout

- Filter bar: Status filter (All, Open, Under Review, Resolved, Dismissed)
- Flags displayed as cards or in a data table, grouped by status
- Default sort: Open flags first, then Under Review, then by `created_at DESC`

### Flag Card Content

| Field | Display |
|-------|---------|
| Bill info | "{Category} - {Provider}" with bill amount |
| Service period | Service start to end date |
| Tenant name | Display name of the flag submitter |
| Reason | Full text of the tenant's reason |
| Suggested amount | Displayed if provided, with delta from original |
| Status | Badge with color coding |
| Submitted | Relative timestamp |

### Status Badge Colors

| Status | Color | Icon |
|--------|-------|------|
| Open | Yellow/Amber | `AlertCircle` |
| Under Review | Blue | `Search` |
| Resolved | Green | `CheckCircle` |
| Dismissed | Gray | `XCircle` |

### Owner Actions

#### Mark as Under Review

- Simple status toggle button
- No form required
- Updates `status` to `under_review` and `updated_at`

#### Resolve (Accept Adjustment)

- Opens a resolution dialog/modal
- Fields:
  - **Adjusted Amount**: Pre-filled with tenant's suggested amount (if provided), otherwise the current bill amount. Editable.
  - **Resolution Note**: Required text field explaining the resolution (min 10 chars)
- On submit:
  1. Update `bill_flags`: status = `resolved`, resolution_note, resolved_amount_cents, resolved_by, resolved_at
  2. Update `bills`: amount_cents = resolved_amount_cents
  3. Recalculate all `bill_splits` for this bill (call person-days engine)
  4. Create notification for tenant (type: `flag_resolved`)
  5. Create notification for all other tenants in the property (type: `bill_updated`) since their shares changed
  6. Send email to tenant (Phase 2)

#### Dismiss

- Opens a dismissal dialog/modal
- Fields:
  - **Dismissal Note**: Required text field explaining why the flag is being dismissed (min 10 chars)
- On submit:
  1. Update `bill_flags`: status = `dismissed`, resolution_note, resolved_by, resolved_at
  2. Create notification for tenant (type: `flag_dismissed`)
  3. Send email to tenant (Phase 2)
  4. No bill amount changes

### Server Actions

```typescript
// lib/actions/flags.ts

async function markFlagUnderReview(flagId: string): Promise<ActionResult>

async function resolveFlag(data: {
  flagId: string;
  resolvedAmountCents: number;
  resolutionNote: string;
}): Promise<ActionResult>

async function dismissFlag(data: {
  flagId: string;
  resolutionNote: string;
}): Promise<ActionResult>
```

---

## 7. Bill Amount Adjustment & Recalculation

When a flag is resolved with an adjusted amount:

1. **Update bill**: Set `bills.amount_cents` to the resolved amount
2. **Delete existing splits**: Remove all `bill_splits` rows for this bill
3. **Recalculate splits**: Run the person-days algorithm with the new amount
4. **Insert new splits**: Store the recalculated `bill_splits` rows
5. **Audit log**: Record the adjustment with old and new amounts

### Recalculation Details

- Uses the same person-days calculation engine as initial bill creation
- Tenant occupancy dates are re-evaluated against the bill's service period
- All tenants in the property are included in the recalculation (not just the flagging tenant)
- The bill's `service_start_date` and `service_end_date` remain unchanged

### Data Integrity

- The entire resolve operation (flag update + bill update + split delete + split insert) must be wrapped in a database transaction
- If any step fails, the entire operation rolls back
- Use Supabase's `rpc` function for transactional operations if needed

---

## 8. Tenant Flag View

### Flag Indicator on Bill Rows

- Bills that the current tenant has flagged display a small flag icon next to the bill amount
- Icon color reflects flag status: amber (open/under_review), green (resolved), gray (dismissed)
- Hovering or clicking the icon shows a tooltip/popover with flag details

### Flag Detail View

- Route: `/dashboard/tenant/properties/[propertyId]/flag/[flagId]`
- Displays full flag details including:
  - Original bill information
  - Tenant's submitted reason and suggested amount
  - Current status with timeline
  - Resolution note (if resolved or dismissed)
  - Adjusted amount vs original amount (if resolved)

### Flag History (Tenant)

- Accessible from tenant settings or bills view
- List of all flags submitted by the tenant across properties
- Filterable by status
- Shows outcome and resolution details

---

## 9. Owner Dashboard Integration

### Flag Count Badge

- Property card on owner dashboard shows a badge with open flag count
- Badge hidden when count is 0
- Uses amber/yellow color to indicate attention needed

### Quick Actions

- Owner dashboard "Recent Activity" section includes flag submissions
- Clicking navigates to the property's flags tab

---

## 10. Validation Rules

### Flag Submission

| Rule | Error Message |
|------|--------------|
| Reason must be >= 10 characters | "Please provide a more detailed reason (at least 10 characters)" |
| Reason must be <= 1000 characters | "Reason is too long (maximum 1000 characters)" |
| Suggested amount must be >= 0 | "Suggested amount cannot be negative" |
| Cannot flag same bill twice (while active) | "You already have an active flag on this bill" |
| Tenant must be member of the property | "You are not a member of this property" |

### Flag Resolution

| Rule | Error Message |
|------|--------------|
| Resolution note must be >= 10 characters | "Please provide a more detailed resolution note" |
| Resolved amount must be >= 0 | "Adjusted amount cannot be negative" |
| Only property owner can resolve | "Only the property owner can resolve flags" |
| Flag must be open or under_review | "This flag has already been resolved or dismissed" |

---

## 11. Acceptance Criteria

### Flag Submission (Tenant)

- [ ] Tenant can submit a flag on any bill in an open or closed cycle
- [ ] Flag form validates reason (min 10 chars) and optional suggested amount (>= 0)
- [ ] Tenant cannot submit a second flag on a bill where they already have an open or under_review flag
- [ ] Flag submission creates a notification for the property owner
- [ ] Success toast displays after successful flag submission
- [ ] Flag icon appears on flagged bill rows in the tenant bills view

### Flag Review (Owner)

- [ ] Owner sees all flags for a property on the Flags tab, grouped by status
- [ ] Owner can filter flags by status (All, Open, Under Review, Resolved, Dismissed)
- [ ] Owner can mark a flag as "Under Review" with one click
- [ ] Owner can resolve a flag with an adjusted amount and resolution note
- [ ] Owner can dismiss a flag with a resolution note
- [ ] Resolving a flag updates the bill amount and recalculates all splits
- [ ] All tenants in the property are notified when splits are recalculated due to a flag resolution
- [ ] Tenant who submitted the flag receives a notification on resolution or dismissal

### Data Integrity

- [ ] Flag resolution + bill update + split recalculation is atomic (all succeed or all fail)
- [ ] Recalculated splits match the person-days algorithm output for the new amount
- [ ] Original bill amount is preserved in the audit log before adjustment
- [ ] Flag status transitions are enforced: open -> under_review -> resolved/dismissed

### UI/UX

- [ ] Flag status badges use consistent color coding across all views
- [ ] Flag detail view shows complete timeline (submitted, under review, resolved/dismissed)
- [ ] Owner property card shows open flag count badge
- [ ] All forms have proper loading states and error handling
- [ ] Flag form and resolution dialogs are keyboard accessible

---

## 12. Technical Notes

- The unique partial index on `(bill_id, tenant_id) WHERE status IN ('open', 'under_review')` prevents duplicate active flags at the database level
- Denormalized `property_id` on `bill_flags` enables efficient RLS policies without joins
- The resolve operation should use a Supabase `rpc` function wrapping the multi-table update in a transaction
- Consider adding an `original_amount_cents` column to `bill_flags` to capture the bill amount at the time of flagging, providing context even if the bill is later adjusted independently
- Flag notifications should include enough metadata for deep linking (bill_id, property_id, flag_id)
- The person-days recalculation on resolve uses the exact same function as initial bill creation to ensure consistency
- Rate limiting consideration: Prevent spam flags by limiting tenants to 5 open flags per property

---

## 13. Out of Scope

- Multi-round dispute resolution (tenant responds to dismissal)
- Automated flag resolution based on rules
- Flag escalation to admin
- Attachment support on flags (e.g., uploading a correct bill image)
- Bulk flag resolution by owner
- Flag analytics or reporting
- Chat or messaging thread on a flag
