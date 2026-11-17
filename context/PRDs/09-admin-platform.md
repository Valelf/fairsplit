# PRD 09 — Admin Platform

> **Feature Area**: Platform Administration, Analytics, User & Property Management
> **Phase**: Phase 3 (basic dashboard metrics in Phase 2)
> **Priority**: Low (Phase 2 basics: Medium)
> **Dependencies**: PRD 02 (Auth & Roles), PRD 03 (Properties & Tenants), PRD 04 (Billing Cycles)

---

## 1. Overview

The admin platform provides FairSplit's platform operators with full visibility into all users, properties, and billing activity. Admins can view analytics, manage users, override bill amounts, and audit platform activity. The admin role is the highest privilege level and has read/write access to all data via dedicated RLS policies. Phase 2 delivers a basic metrics dashboard, while Phase 3 adds full CRUD management, user impersonation, and audit logging.

---

## 2. Goals

- Provide platform operators with real-time analytics on users, properties, and billing volume
- Enable user management including role changes and profile editing
- Allow property and bill oversight with override capabilities
- Maintain a comprehensive audit trail of all admin actions
- Support user impersonation for debugging and support (Phase 3)

---

## 3. User Stories

### Dashboard & Analytics

| ID | Role | Story | Priority |
|----|------|-------|----------|
| AD-01 | Admin | I want to see total user count broken down by role so I understand platform adoption | High |
| AD-02 | Admin | I want to see total properties and bills processed so I can track platform usage | High |
| AD-03 | Admin | I want to see total amount billed across the platform so I understand volume | High |
| AD-04 | Admin | I want to see growth charts showing new users and properties over time | Medium |
| AD-05 | Admin | I want to see active vs inactive properties to understand engagement | Medium |
| AD-06 | Admin | I want to see recent platform activity (new users, new properties, new bills) | Medium |

### User Management

| ID | Role | Story | Priority |
|----|------|-------|----------|
| AD-07 | Admin | I want to view a searchable, filterable table of all users | High |
| AD-08 | Admin | I want to filter users by role (admin, owner, tenant) | High |
| AD-09 | Admin | I want to view a user's full profile including their properties and billing history | High |
| AD-10 | Admin | I want to change a user's role (e.g., promote tenant to owner) | Medium |
| AD-11 | Admin | I want to update a user's profile information | Medium |
| AD-12 | Admin | I want to impersonate a user to see the platform from their perspective | Low |
| AD-13 | Admin | I want to deactivate a user account without deleting their data | Medium |

### Property Management

| ID | Role | Story | Priority |
|----|------|-------|----------|
| AD-14 | Admin | I want to view a searchable table of all properties | High |
| AD-15 | Admin | I want to filter properties by owner | High |
| AD-16 | Admin | I want to view any property's full detail (same as owner view) | High |
| AD-17 | Admin | I want to override any bill's amount when needed for support | Medium |
| AD-18 | Admin | I want to edit property details (name, address, settings) | Medium |
| AD-19 | Admin | I want to see all billing cycles and splits for any property | High |

### Audit & Compliance

| ID | Role | Story | Priority |
|----|------|-------|----------|
| AD-20 | Admin | I want all my admin actions logged for compliance | High |
| AD-21 | Admin | I want to view the audit log to see what actions were taken and by whom | Medium |
| AD-22 | Admin | I want to filter audit logs by action type, user, or date range | Medium |

---

## 4. Route Structure

All admin routes are nested under `/dashboard/admin/`:

| Route | Page | Phase |
|-------|------|-------|
| `/dashboard/admin` | Admin Dashboard (analytics) | Phase 2 |
| `/dashboard/admin/users` | Users Management Table | Phase 3 |
| `/dashboard/admin/users/[userId]` | User Detail | Phase 3 |
| `/dashboard/admin/properties` | Properties Management Table | Phase 3 |
| `/dashboard/admin/properties/[propertyId]` | Property Detail (admin view) | Phase 3 |
| `/dashboard/admin/audit-log` | Audit Log Viewer | Phase 3 |

### Route Protection

- Middleware checks `profiles.role === 'admin'` for all `/dashboard/admin/*` routes
- Non-admin users are redirected to their role-appropriate dashboard
- Admin RLS policies grant full read/write access to all tables

---

## 5. Admin Dashboard (Phase 2)

### Metric Cards Row

Four metric cards displayed in a responsive grid (1 column mobile, 2 tablet, 4 desktop):

| Metric | Query | Icon | Format |
|--------|-------|------|--------|
| Total Users | `COUNT(*) FROM profiles` grouped by role | `Users` | "124 users (12 owners, 108 tenants, 4 admins)" |
| Total Properties | `COUNT(*) FROM properties WHERE deleted_at IS NULL` | `Building2` | "47 properties" |
| Total Bills | `COUNT(*) FROM bills` | `Receipt` | "1,234 bills processed" |
| Total Billed | `SUM(amount_cents) FROM bills` | `DollarSign` | "$45,678.90" |

### Growth Charts

Two charts in a 2-column grid (stacked on mobile):

#### New Users Over Time (Bar Chart)

- X-axis: Month (last 12 months)
- Y-axis: Count of new users
- Stacked bars: Owners (blue) and Tenants (green)
- Data: `GROUP BY date_trunc('month', created_at)` from `profiles`

#### New Properties Over Time (Area Chart)

- X-axis: Month (last 12 months)
- Y-axis: Count of new properties
- Single area fill with line
- Data: `GROUP BY date_trunc('month', created_at)` from `properties`

### Active vs Inactive Properties

- Donut/pie chart showing:
  - **Active**: Properties with at least one billing cycle updated in the last 90 days
  - **Inactive**: All other properties
- Displayed alongside or below growth charts

### Recent Activity Feed

- Last 10 platform events displayed as a timeline/list
- Events: User signups, new properties created, cycles closed, flags submitted
- Each event shows: Icon, description, user name, relative timestamp
- Click navigates to the relevant admin detail page

### Data Fetching

- Server component with parallel data fetching
- All queries use the admin Supabase client (service role or admin-authenticated)
- Dashboard page: `app/(dashboard)/admin/page.tsx`

---

## 6. Users Management (Phase 3)

### Users Table

- Component: `components/admin/users-table.tsx`
- Built with `@tanstack/react-table` + shadcn DataTable pattern

| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| Name | Text | Yes | Search |
| Email | Text | Yes | Search |
| Role | Badge | Yes | Dropdown (admin, owner, tenant) |
| Properties | Number | Yes | No |
| Total Billed | Currency | Yes | No |
| Status | Badge | Yes | Dropdown (active, deactivated) |
| Created | Date | Yes | Date range |
| Actions | Menu | No | No |

### Table Features

- Server-side pagination (20 rows per page)
- Search across name and email (debounced, 300ms)
- Column sorting (single column at a time)
- Role filter dropdown
- Export to CSV (future)

### Row Actions Dropdown

| Action | Description |
|--------|-------------|
| View Details | Navigate to `/dashboard/admin/users/[userId]` |
| Edit Profile | Open inline edit dialog |
| Change Role | Open role change confirmation dialog |
| Deactivate | Soft-disable the account (sets `deactivated_at`) |

### User Detail Page

- Route: `/dashboard/admin/users/[userId]`
- Sections:
  - **Profile Card**: Name, email, role, avatar, join date, last active
  - **Properties**: Table of properties (owned or tenant membership)
  - **Billing Summary**: Total billed, total owed, payment history
  - **Activity Timeline**: Recent actions by this user
  - **Flags**: Flags submitted (tenant) or flags received (owner)

### Edit User Dialog

| Field | Editable | Validation |
|-------|----------|------------|
| Full Name | Yes | Min 2 chars |
| Email | No (read-only) | N/A |
| Role | Yes (with confirmation) | Must be valid role |
| Deactivated | Yes (toggle) | Confirmation required |

### Role Change Flow

1. Admin selects new role from dropdown
2. Confirmation dialog: "Change {name}'s role from {oldRole} to {newRole}? This will affect their access permissions."
3. On confirm: Update `profiles.role`, log to audit_log
4. If changing owner to tenant: Warn about orphaned properties
5. If changing tenant to owner: No side effects

---

## 7. Properties Management (Phase 3)

### Properties Table

- Component: `components/admin/properties-table.tsx`
- Same DataTable pattern as users table

| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| Property Name | Text | Yes | Search |
| Owner | Text | Yes | Dropdown |
| Location | Text | Yes | No |
| Tenants | Number | Yes | No |
| Cycles | Number | Yes | No |
| Total Billed | Currency | Yes | No |
| Status | Badge | Yes | Dropdown |
| Created | Date | Yes | No |
| Actions | Menu | No | No |

### Property Detail (Admin View)

- Same layout as the owner property detail page
- Additional admin capabilities:
  - Edit property name, address, timezone, transparency level
  - Override any bill's amount (with audit log entry)
  - View owner profile from the property page
  - Delete property (soft delete via `deleted_at`)

### Bill Amount Override

1. Admin navigates to a bill within a property's cycle
2. Clicks "Override Amount" from the bill row actions
3. Override dialog:
   - Current amount (read-only)
   - New amount (currency input, required)
   - Override reason (text, required, min 10 chars)
4. On submit:
   - Update `bills.amount_cents`
   - Recalculate all `bill_splits` for this bill
   - Log to `audit_log` with old amount, new amount, reason
   - Create notification for property owner (type: `bill_updated`)

---

## 8. Audit Log

### `audit_log` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Unique log entry ID |
| `actor_id` | `uuid` | FK -> profiles.id, NOT NULL | User who performed the action |
| `action` | `text` | NOT NULL | Action type identifier |
| `entity_type` | `text` | NOT NULL | Table/entity affected |
| `entity_id` | `uuid` | NOT NULL | ID of the affected record |
| `old_values` | `jsonb` | NULL | Previous state (for updates) |
| `new_values` | `jsonb` | NULL | New state (for updates/creates) |
| `metadata` | `jsonb` | NULL | Additional context (IP, reason) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | When the action occurred |

### Action Types

| Action | Entity Type | Trigger |
|--------|-------------|---------|
| `user.role_changed` | `profiles` | Admin changes a user's role |
| `user.deactivated` | `profiles` | Admin deactivates a user |
| `user.profile_updated` | `profiles` | Admin edits user profile |
| `property.updated` | `properties` | Admin edits property details |
| `property.deleted` | `properties` | Admin soft-deletes a property |
| `bill.amount_overridden` | `bills` | Admin overrides a bill amount |
| `impersonation.started` | `profiles` | Admin starts impersonating a user |
| `impersonation.ended` | `profiles` | Admin ends impersonation session |

### RLS Policies

| Policy | Action | Rule |
|--------|--------|------|
| `audit_log_insert_admin` | INSERT | `profiles.role = 'admin'` (via service role) |
| `audit_log_select_admin` | SELECT | `profiles.role = 'admin'` |

### Audit Log Viewer

- Route: `/dashboard/admin/audit-log`
- Table with filters:
  - Action type (dropdown)
  - Actor (search/dropdown)
  - Entity type (dropdown)
  - Date range (date picker)
- Each row expandable to show old_values / new_values diff
- Pagination: 50 rows per page
- Sorted by `created_at DESC` (newest first)

### Audit Helper Function

```typescript
// lib/actions/audit.ts
async function logAuditEvent(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<void>
```

This function is called within every admin server action after the primary mutation succeeds.

---

## 9. User Impersonation (Phase 3)

### Overview

Admins can temporarily view the platform as another user for debugging and support purposes. This creates a temporary session that preserves the admin's identity while presenting the target user's data and permissions.

### Flow

1. Admin clicks "View as this user" on a user detail page
2. Confirmation dialog: "You will see the platform as {name} ({role}). Your actions will be logged."
3. On confirm:
   - Store admin's real user ID in a secure, HttpOnly cookie (`x-admin-impersonating`)
   - Set session to target user's context
   - Redirect to the target user's default dashboard
4. A persistent banner appears at the top: "You are viewing as {name}. [End Session]"
5. Clicking "End Session" or navigating to `/dashboard/admin`:
   - Restore admin session
   - Remove impersonation cookie
   - Log `impersonation.ended` to audit log
   - Redirect back to admin dashboard

### Security

- Impersonation cookie is HttpOnly, Secure, SameSite=Strict
- All actions during impersonation are logged with both admin ID and impersonated user ID
- Impersonation sessions auto-expire after 30 minutes
- Admin cannot impersonate other admins
- Write operations are blocked during impersonation (read-only view)

### API Route

```
POST /api/admin/impersonate
Body: { targetUserId: string }
Response: { success: boolean, redirectUrl: string }

DELETE /api/admin/impersonate
Response: { success: boolean, redirectUrl: string }
```

---

## 10. Admin RLS Policies

### Global Admin Policies (Applied to All Tables)

```sql
-- Pattern for each table:
CREATE POLICY "admin_full_access" ON {table_name}
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### Tables Requiring Admin Policies

- `profiles` (read all, update role/profile)
- `properties` (read all, update, soft delete)
- `property_tenants` (read all)
- `billing_cycles` (read all)
- `bills` (read all, update amount)
- `bill_splits` (read all, delete + insert on recalculation)
- `bill_flags` (read all)
- `notifications` (read all)
- `audit_log` (insert, read)
- `subscription_plans` (full CRUD)
- `user_subscriptions` (read all, update)

---

## 11. Acceptance Criteria

### Phase 2 — Basic Dashboard

- [ ] Admin dashboard route is protected; non-admin users are redirected
- [ ] Four metric cards display correct totals (users by role, properties, bills, amount)
- [ ] Growth charts render with correct monthly data for the last 12 months
- [ ] Active vs inactive property breakdown displays correctly
- [ ] Recent activity feed shows the latest 10 platform events
- [ ] Dashboard loads in under 2 seconds with parallel data fetching
- [ ] Dashboard is responsive across mobile, tablet, and desktop breakpoints

### Phase 3 — Full Management

- [ ] Users table supports search, sort, role filter, and pagination
- [ ] User detail page shows profile, properties, billing summary, and activity
- [ ] Admin can change a user's role with confirmation dialog
- [ ] Admin can deactivate a user account
- [ ] Properties table supports search, sort, owner filter, and pagination
- [ ] Admin can view any property with full detail (same as owner view)
- [ ] Admin can override a bill amount with reason; splits recalculate correctly
- [ ] All admin mutations are recorded in the audit_log table
- [ ] Audit log viewer supports filtering by action type, actor, entity type, and date range
- [ ] Audit log entries show old/new value diffs in an expandable row

### Phase 3 — Impersonation

- [ ] Admin can initiate impersonation from user detail page
- [ ] Impersonation banner displays with target user name and end session button
- [ ] Platform renders the target user's dashboard and data
- [ ] Write operations are blocked during impersonation
- [ ] Impersonation session auto-expires after 30 minutes
- [ ] Both start and end of impersonation are logged to audit_log
- [ ] Admin cannot impersonate other admins

---

## 12. Technical Notes

- Admin dashboard queries should use `COUNT` and `SUM` aggregations at the database level, not fetch-all-and-count in JavaScript
- Consider creating database views or materialized views for frequently computed metrics
- The admin Supabase client should use the service role key for queries that span multiple users' data
- Growth chart data can be cached for 5 minutes using `revalidate` on the server component
- The impersonation feature requires careful session management; consider using Supabase's `auth.admin.getUserById()` for session switching
- Audit log writes should be non-blocking (fire-and-forget) to avoid slowing down admin operations
- For the properties table, join with `profiles` to display owner name and with aggregated bill counts
- Admin components live in `components/admin/` following the project file organization conventions
- The admin dashboard page is a server component; charts use client components hydrated with server-fetched data

---

## 13. Out of Scope

- Admin API (external API for programmatic admin access)
- Multi-admin role hierarchy (super admin vs limited admin)
- Admin notifications or alerting (e.g., unusual activity alerts)
- Bulk operations (bulk role change, bulk property delete)
- Admin-to-user messaging
- Revenue dashboard (deferred to PRD 10 monetization)
- Custom admin dashboard widgets or layout configuration
