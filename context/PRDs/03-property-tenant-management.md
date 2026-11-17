# PRD 03: Property & Tenant Management

**Version:** 1.0
**Status:** Draft
**Author:** Product Team
**Last Updated:** 2026-02-08
**Dependencies:** PRD 01 (Platform Overview), PRD 02 (Authentication & Authorization)

---

## 1. Overview

Property and tenant management are foundational features of FairSplit. Owners create properties, add tenants with occupancy dates, and manage tenant lifecycle (invited, active, departed). This data directly feeds the person-days bill splitting algorithm, making accuracy here critical to fair calculations.

## 2. Goals

- Enable owners to manage multiple properties independently.
- Support flexible tenant onboarding (invite or pre-create).
- Track precise move-in and move-out dates for accurate bill splitting.
- Provide clear property overview with tenant count, active cycles, and billing totals.
- Enforce data isolation between owners via RLS.

## 3. Data Models

### 3.1 Properties Table

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  transparency_level TEXT NOT NULL DEFAULT 'own_share'
    CHECK (transparency_level IN ('full', 'own_share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `owner_id` | UUID | FK to profiles.id, the owner of this property |
| `name` | TEXT | Display name (e.g., "575 McKinney") |
| `address_line1` | TEXT | Street address |
| `address_line2` | TEXT | Unit, suite, apt (optional) |
| `city` | TEXT | City |
| `state` | TEXT | State/province |
| `zip` | TEXT | Postal/zip code |
| `country` | TEXT | Country code (default: US) |
| `timezone` | TEXT | IANA timezone (default: America/Chicago) |
| `transparency_level` | TEXT | "full" or "own_share" |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp (null = active) |

### 3.2 Property Tenants Table

```sql
CREATE TABLE property_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  join_date DATE NOT NULL,
  leave_date DATE,
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'departed')),
  invite_token UUID DEFAULT gen_random_uuid(),
  invite_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `property_id` | UUID | FK to properties.id |
| `user_id` | UUID | FK to profiles.id (null until tenant claims account) |
| `email` | TEXT | Tenant's email address |
| `display_name` | TEXT | Display name for bill split tables |
| `join_date` | DATE | Move-in date (inclusive) |
| `leave_date` | DATE | Move-out date (inclusive, null = still active) |
| `status` | TEXT | "invited", "active", or "departed" |
| `invite_token` | UUID | Unique token for claim-invite flow |
| `invite_sent_at` | TIMESTAMPTZ | When invite email was last sent |
| `created_at` | TIMESTAMPTZ | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## 4. Property Management

### 4.1 User Stories

#### US-PROP-01: Create Property
> As an owner, I want to create a new property with its address and settings so that I can start managing bills for it.

**Acceptance Criteria:**
- [ ] Form fields: name (required), address_line1 (required), address_line2 (optional), city (required), state (required), zip (required), country (default: US), timezone (default: America/Chicago).
- [ ] Validation: All required fields must be non-empty. Zip must be valid format.
- [ ] On submit, property is created via server action.
- [ ] Owner is redirected to the new property's detail page.
- [ ] Property appears in the owner's property list.

#### US-PROP-02: View Property List
> As an owner, I want to see all my properties in a list so that I can navigate to any of them.

**Acceptance Criteria:**
- [ ] Property list page at `/dashboard/owner`.
- [ ] Each property shown as a card with: name, address, tenant count, active cycle label, total billed (all cycles).
- [ ] Cards are clickable, navigating to `/dashboard/owner/properties/{id}`.
- [ ] Empty state shown if no properties exist, with CTA to create one.
- [ ] Properties soft-deleted (`deleted_at` not null) are not shown.

#### US-PROP-03: View Property Detail
> As an owner, I want to see a detailed view of a single property with tabs for different aspects.

**Acceptance Criteria:**
- [ ] Property detail page at `/dashboard/owner/properties/{id}`.
- [ ] Tabbed interface with: Overview, Bills, Tenants, Cycles, Settings, Flags.
- [ ] Overview tab shows summary stats: total tenants (active), current cycle, total billed.
- [ ] Each tab loads its content without full page reload (client-side tab switching).

#### US-PROP-04: Edit Property
> As an owner, I want to edit my property's details so that I can correct or update information.

**Acceptance Criteria:**
- [ ] Edit button on property detail page or in Settings tab.
- [ ] Pre-filled form with current property data.
- [ ] Same validation as create form.
- [ ] On submit, property is updated via server action.
- [ ] `updated_at` timestamp is refreshed.
- [ ] Changes reflected immediately on the property detail page.

#### US-PROP-05: Delete Property
> As an owner, I want to delete a property so that it no longer appears in my list.

**Acceptance Criteria:**
- [ ] Delete action available in Settings tab.
- [ ] Confirmation dialog warns: "This will archive the property and all associated data."
- [ ] Deletion is a soft delete (sets `deleted_at`).
- [ ] Property no longer appears in property list.
- [ ] Associated billing data is preserved but inaccessible through the UI.

### 4.2 Property Detail Tabs

| Tab | Content | Phase |
|-----|---------|-------|
| Overview | Summary stats, recent activity | Phase 1 |
| Bills | All bills across all cycles, filterable | Phase 1 |
| Tenants | Tenant list with status, dates, actions | Phase 1 |
| Cycles | All billing cycles with status | Phase 1 |
| Settings | Property settings, edit, delete | Phase 1 |
| Flags | Flagged bills and disputes | Phase 2 |

## 5. Tenant Management

### 5.1 Tenant Onboarding Methods

#### Method 1: Invite via Email

```
1. Owner clicks "Add Tenant" on property's Tenants tab
2. Owner enters: display_name, email, join_date
3. System creates property_tenants record with status='invited'
4. System sends invite email with claim link
5. Tenant clicks claim link -> claim flow (see PRD 02)
6. On successful claim: status changes to 'active', user_id is set
```

#### Method 2: Pre-Create Profile

```
1. Owner clicks "Add Tenant" on property's Tenants tab
2. Owner enters: display_name, email, join_date
3. Owner checks "Don't send invite now" checkbox
4. System creates property_tenants record with status='invited'
5. No email is sent immediately
6. Owner can manually send invite later via "Send Invite" button
7. Tenant claims when ready
```

### 5.2 User Stories

#### US-TEN-01: Add Tenant
> As an owner, I want to add a tenant to my property so that they are included in bill splitting.

**Acceptance Criteria:**
- [ ] "Add Tenant" button on property's Tenants tab.
- [ ] Modal/form with fields: display_name (required), email (required), join_date (required, date picker).
- [ ] Option to send invite immediately or pre-create without sending.
- [ ] Validation: email format, join_date not in the future (warning if so), no duplicate email for same property.
- [ ] On submit, `property_tenants` record created via server action.
- [ ] If "send invite" checked, invite email is sent and `invite_sent_at` is set.
- [ ] Tenant appears in the Tenants tab with appropriate status badge.

#### US-TEN-02: View Tenant List
> As an owner, I want to see all tenants for a property so that I can manage their status and dates.

**Acceptance Criteria:**
- [ ] Tenants tab shows a table with columns: Name, Email, Status, Join Date, Leave Date, Actions.
- [ ] Status displayed as badges: "Invited" (yellow), "Active" (green), "Departed" (gray).
- [ ] Active tenants sorted first, then invited, then departed.
- [ ] Actions column includes: Edit, Resend Invite (if invited), Mark Departed (if active).

#### US-TEN-03: Edit Tenant
> As an owner, I want to edit a tenant's details so that I can correct their name or dates.

**Acceptance Criteria:**
- [ ] Edit action opens a modal/form pre-filled with current data.
- [ ] Editable fields: display_name, join_date, leave_date.
- [ ] Email is read-only after creation (cannot be changed).
- [ ] Validation: join_date must be before leave_date (if set).
- [ ] On save, record updated via server action.
- [ ] **Critical:** If join_date or leave_date changes, all affected bill splits must be recalculated.

#### US-TEN-04: Mark Tenant as Departed
> As an owner, I want to mark a tenant as departed so that they are excluded from future bill calculations.

**Acceptance Criteria:**
- [ ] "Mark Departed" action available for tenants with status='active'.
- [ ] Action prompts for leave_date (defaults to today).
- [ ] On confirm, tenant status changes to 'departed' and leave_date is set.
- [ ] Tenant remains visible in the list with "Departed" status.
- [ ] **Critical:** All bill splits for bills with service dates overlapping or after the leave_date are recalculated.
- [ ] Departed tenants retain access to view historical bills (if they have an auth account).

#### US-TEN-05: Resend Invite
> As an owner, I want to resend an invite to a tenant who hasn't claimed their account.

**Acceptance Criteria:**
- [ ] "Resend Invite" action available for tenants with status='invited'.
- [ ] Generates a new invite token and sends a new invite email.
- [ ] Updates `invite_sent_at` timestamp.
- [ ] Previous invite token is invalidated.
- [ ] Rate limit: Maximum 3 resends per tenant per day.

#### US-TEN-06: Remove Tenant
> As an owner, I want to remove a tenant from a property in case they were added by mistake.

**Acceptance Criteria:**
- [ ] "Remove" action available for tenants with status='invited' only.
- [ ] Cannot remove active or departed tenants (must mark as departed first).
- [ ] Confirmation dialog: "This will remove the tenant record. Any existing bill splits for this tenant will be deleted."
- [ ] On confirm, record is deleted (hard delete for invited-only tenants).
- [ ] Bill splits referencing this tenant are recalculated.

## 6. Transparency Settings

### 6.1 Levels

| Level | Tenant Can See |
|-------|---------------|
| `full` | All tenants' names, person-days, and amounts for every bill |
| `own_share` | Only their own person-days, amounts, and totals. Other tenants shown as anonymized or hidden |

### 6.2 User Story

#### US-TRANS-01: Configure Transparency
> As an owner, I want to set the transparency level for my property so that I control what tenants can see about each other's bills.

**Acceptance Criteria:**
- [ ] Transparency setting available in property Settings tab.
- [ ] Toggle between "Full Transparency" and "Own Share Only".
- [ ] Default for new properties: "Own Share Only".
- [ ] Change takes effect immediately for tenant views.
- [ ] Owner always sees full data regardless of transparency setting.
- [ ] Description text explains what each setting means.

## 7. Multi-Property Support

### 7.1 User Story

#### US-MULTI-01: Manage Multiple Properties
> As an owner, I want to manage multiple properties independently so that each property has its own tenants, cycles, and bills.

**Acceptance Criteria:**
- [ ] Owner dashboard lists all properties.
- [ ] Each property is completely independent (separate tenants, cycles, bills).
- [ ] A tenant can exist on multiple properties (different `property_tenants` records with same email).
- [ ] Navigation allows easy switching between properties.
- [ ] Property-level data isolation: no cross-property data leakage.

## 8. RLS Policies

### 8.1 Properties Table

| Policy | Operation | Condition |
|--------|-----------|-----------|
| admin_full_access | ALL | `get_user_role() = 'admin'` |
| owner_select_own | SELECT | `owner_id = auth.uid()` |
| owner_insert_own | INSERT | `owner_id = auth.uid()` |
| owner_update_own | UPDATE | `owner_id = auth.uid()` |
| owner_delete_own | DELETE | `owner_id = auth.uid()` |
| tenant_select_own_property | SELECT | EXISTS in `property_tenants` where `user_id = auth.uid()` and `property_id = properties.id` |

### 8.2 Property Tenants Table

| Policy | Operation | Condition |
|--------|-----------|-----------|
| admin_full_access | ALL | `get_user_role() = 'admin'` |
| owner_manage_own | ALL | Property's `owner_id = auth.uid()` |
| tenant_read_own | SELECT | `user_id = auth.uid()` |
| tenant_read_same_property | SELECT | Same `property_id` as a `property_tenants` record where `user_id = auth.uid()` AND property `transparency_level = 'full'` |

## 9. UI Components

### 9.1 Component Hierarchy

```
PropertyListPage (page)
  PropertyCard (organism) x N
    PropertyCardStats (molecule)
      StatBadge (atom) x 3

PropertyDetailPage (page)
  PropertyHeader (organism)
  PropertyTabs (organism)
    OverviewTab (organism)
    BillsTab (organism)
    TenantsTab (organism)
      TenantTable (organism)
        TenantRow (molecule) x N
          StatusBadge (atom)
          TenantActions (molecule)
    CyclesTab (organism)
    SettingsTab (organism)
      PropertyForm (organism)
      TransparencyToggle (molecule)
      DeletePropertyAction (molecule)

AddTenantModal (organism)
  TenantForm (molecule)
    Input (atom) x 3
    DatePicker (atom)
    Checkbox (atom)
    Button (atom)

EditTenantModal (organism)
  TenantForm (molecule)

MarkDepartedModal (organism)
  DatePicker (atom)
  Button (atom) x 2
```

### 9.2 Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 640px) | Property cards stack vertically, tenant table becomes card list |
| Tablet (640-1024px) | Property cards in 2-column grid, tenant table with horizontal scroll |
| Desktop (> 1024px) | Property cards in 3-column grid, full tenant table |

## 10. Server Actions

| Action | Input | Validation | Side Effects |
|--------|-------|------------|-------------|
| `createProperty` | Property fields | Required fields, zip format | Create record, revalidate path |
| `updateProperty` | Property ID + fields | Same as create | Update record, revalidate path |
| `deleteProperty` | Property ID | Owner check | Soft delete, revalidate path |
| `addTenant` | Tenant fields + property ID | Email format, date validity, no duplicates | Create record, optionally send invite, recalculate splits |
| `updateTenant` | Tenant ID + fields | Date validity | Update record, recalculate splits if dates changed |
| `markTenantDeparted` | Tenant ID + leave_date | Date validity | Update status and leave_date, recalculate splits |
| `removeTenant` | Tenant ID | Must be 'invited' status | Delete record, recalculate splits |
| `resendInvite` | Tenant ID | Must be 'invited', rate limit | New token, send email, update invite_sent_at |
| `updateTransparency` | Property ID + level | Valid level value | Update property, revalidate path |

## 11. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Tenant added with future join_date | Allowed with warning. Not included in splits until join_date. |
| Leave_date before join_date | Validation error, not allowed. |
| Duplicate email for same property | Validation error, not allowed. |
| Same email across different properties | Allowed. Separate `property_tenants` records. |
| Owner deletes property with active tenants | Soft delete. Tenants lose access. Bills preserved. |
| Tenant join_date changed after bills exist | All affected bill splits recalculated automatically. |
| Property with zero tenants | Bills can be created but splits will have zero entries. Warning shown. |

## 12. Technical Notes

- Use server actions (not API routes) for all mutations.
- Use `revalidatePath` after mutations to refresh the UI.
- Tenant date changes trigger split recalculation via a shared utility function (see PRD 04).
- Invite emails use Supabase's built-in email templates (MVP). Custom templates in Phase 2.
- Property soft deletion: set `deleted_at`, filter in all queries with `WHERE deleted_at IS NULL`.
- Timezone is stored on the property but all dates are stored as UTC in the database.

---

*Next: PRD 04 covers Billing Cycles and the Person-Days Bill Splitting Algorithm.*
