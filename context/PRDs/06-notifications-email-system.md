# PRD 06 — Notifications & Email System

> **Feature Area**: In-App Notifications + Transactional Email
> **Phase**: Phase 1 (in-app DB only), Phase 2 (Supabase Realtime + email via Resend)
> **Priority**: High
> **Dependencies**: PRD 02 (Auth), PRD 03 (Tenants), PRD 04 (Billing Cycles)

---

## 1. Overview

FairSplit needs a unified notification system that keeps users informed about billing activity, invitations, and flag resolutions. Phase 1 delivers database-backed in-app notifications displayed in the topbar. Phase 2 adds Supabase Realtime for live bell updates and transactional email delivery via Resend with React Email templates.

---

## 2. Goals

- Ensure owners and tenants are promptly informed of relevant billing events
- Provide a non-intrusive notification bell with unread count badge in the topbar
- Deliver transactional emails for critical events (invites, new bills, flag resolutions)
- Allow future opt-out preferences for non-essential email notifications

---

## 3. User Stories

### In-App Notifications

| ID | Role | Story | Priority |
|----|------|-------|----------|
| N-01 | Owner | I want to see a notification when a tenant submits a bill flag so I can review it promptly | High |
| N-02 | Tenant | I want to see a notification when a new bill is added to my property so I know my share | High |
| N-03 | Tenant | I want to see a notification when a billing cycle is closed so I can review my totals | High |
| N-04 | Tenant | I want to see a notification when my flag is resolved or dismissed so I know the outcome | High |
| N-05 | All | I want to see a red badge on the notification bell showing my unread count | High |
| N-06 | All | I want to click a notification to navigate to the relevant page (bill, flag, property) | Medium |
| N-07 | All | I want to mark individual notifications as read | High |
| N-08 | All | I want to mark all notifications as read in one action | Medium |
| N-09 | Tenant | I want to receive a notification when I am invited to a property | High |
| N-10 | Owner | I want to receive a payment reminder notification for tenants with outstanding balances | Low |

### Email Notifications (Phase 2)

| ID | Role | Story | Priority |
|----|------|-------|----------|
| E-01 | Tenant | I want to receive an email when I am invited to join a property | High |
| E-02 | Tenant | I want to receive an email when a new bill is added to my property | Medium |
| E-03 | Tenant | I want to receive an email when a billing cycle is closed | Medium |
| E-04 | Owner | I want to receive an email when a tenant submits a flag | Medium |
| E-05 | Tenant | I want to receive an email when my flag is resolved or dismissed | Medium |
| E-06 | All | I want to receive a magic link email to sign in | High |
| E-07 | All | I want to opt out of non-essential email notifications in my settings | Low |

---

## 4. Database Schema

### `notifications` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Unique notification ID |
| `user_id` | `uuid` | FK -> profiles.id, NOT NULL | Recipient user |
| `type` | `text` | NOT NULL, CHECK enum | Notification type (see below) |
| `title` | `text` | NOT NULL | Short notification title |
| `body` | `text` | NULL | Longer description text |
| `is_read` | `boolean` | NOT NULL, default `false` | Read status |
| `metadata` | `jsonb` | NULL | Contextual data for deep linking |
| `property_id` | `uuid` | FK -> properties.id, NULL | Denormalized for RLS |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |

### Notification Types (CHECK constraint)

```sql
CHECK (type IN (
  'new_bill',
  'cycle_closed',
  'tenant_invited',
  'flag_submitted',
  'flag_resolved',
  'flag_dismissed',
  'payment_reminder',
  'bill_updated'
))
```

### Metadata Examples

```json
// new_bill
{ "bill_id": "uuid", "cycle_id": "uuid", "property_id": "uuid", "category": "electricity", "amount_cents": 27600 }

// cycle_closed
{ "cycle_id": "uuid", "property_id": "uuid", "cycle_label": "Sept - Oct", "total_cents": 50442 }

// tenant_invited
{ "property_id": "uuid", "property_name": "575 McKinney", "invite_token": "abc123" }

// flag_submitted (sent to owner)
{ "flag_id": "uuid", "bill_id": "uuid", "property_id": "uuid", "tenant_name": "Val" }

// flag_resolved / flag_dismissed (sent to tenant)
{ "flag_id": "uuid", "bill_id": "uuid", "property_id": "uuid", "resolution_note": "Adjusted amount" }
```

### RLS Policies

| Policy | Action | Rule |
|--------|--------|------|
| `notifications_select_own` | SELECT | `auth.uid() = user_id` |
| `notifications_update_own` | UPDATE | `auth.uid() = user_id` (only `is_read` column) |
| `notifications_insert_service` | INSERT | Via server actions only (service role) |
| `notifications_admin_all` | ALL | `profiles.role = 'admin'` |

### Indexes

```sql
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
```

---

## 5. In-App Notification UI

### Notification Bell (Topbar Component)

- Location: Top-right of the authenticated layout topbar, left of the user avatar/menu
- Displays a `Bell` icon (lucide-react)
- Unread count badge: Red circle with white number, hidden when count is 0
- Badge shows "9+" when unread count exceeds 9
- Click opens a dropdown panel (Radix `Popover`) anchored to the bell icon

### Notification Panel (Dropdown)

- Max height: 400px with overflow scroll
- Header row: "Notifications" title + "Mark all as read" text button
- Each notification row contains:
  - Icon based on type (color-coded): `Receipt` for new_bill, `Lock` for cycle_closed, `UserPlus` for tenant_invited, `Flag` for flag_submitted/resolved, `Clock` for payment_reminder
  - Title (bold if unread)
  - Body text (truncated to 2 lines)
  - Relative timestamp (e.g., "2 hours ago") using `date-fns formatDistanceToNow`
  - Unread indicator dot (left side, blue)
- Click on a notification: Mark as read + navigate to relevant page using metadata
- Empty state: "No notifications yet" with muted icon
- Footer: "View all notifications" link (future full-page notifications view)

### Navigation Mapping

| Type | Navigate To |
|------|------------|
| `new_bill` | `/dashboard/[role]/properties/[propertyId]/bills` |
| `cycle_closed` | `/dashboard/[role]/properties/[propertyId]/cycles/[cycleId]` |
| `tenant_invited` | `/auth/claim/[token]` (tenant) or `/dashboard/owner/properties/[propertyId]/tenants` (owner) |
| `flag_submitted` | `/dashboard/owner/properties/[propertyId]/flags` |
| `flag_resolved` | `/dashboard/tenant/properties/[propertyId]/bills` |
| `payment_reminder` | `/dashboard/tenant/properties/[propertyId]/bills` |

---

## 6. Supabase Realtime (Phase 2)

### Subscription Strategy

- Subscribe to `notifications` table filtered by `user_id = auth.uid()` and `is_read = false`
- Listen for INSERT events only (new notifications)
- On new notification: Increment the bell badge count client-side
- Do NOT render the full notification in the dropdown until next fetch (avoids stale data)
- Use the `useRealtimeNotifications` hook in `lib/hooks/use-realtime.ts`

### Hook Interface

```typescript
function useRealtimeNotifications(): {
  unreadCount: number;
  hasNew: boolean;       // flash animation trigger
  resetHasNew: () => void;
}
```

### Connection Management

- Subscribe on mount in the authenticated layout
- Unsubscribe on unmount
- Reconnect on visibility change (tab refocus)
- Graceful fallback: If Realtime fails, poll every 60 seconds

---

## 7. Server Actions

### `getNotifications(limit?: number)`

- Returns notifications for the current user, ordered by `created_at DESC`
- Default limit: 20
- Includes unread count as a separate field

### `markNotificationRead(notificationId: string)`

- Sets `is_read = true` for the given notification
- Validates ownership via RLS

### `markAllNotificationsRead()`

- Sets `is_read = true` for all notifications belonging to `auth.uid()`

### `createNotification(data: CreateNotificationInput)`

- Internal function called by other server actions (bill creation, cycle close, flag submit)
- Uses service role client to bypass RLS for insertion
- Input validated with Zod schema

---

## 8. Email Notifications (Phase 2)

### Email Provider: Resend

- SDK: `resend` npm package
- Env variable: `RESEND_API_KEY`
- From address: `noreply@fairsplit.app` (or custom domain)
- Templates built with `react-email` and `@react-email/components`

### Email Templates

| Template | Trigger | Recipient | Subject Line |
|----------|---------|-----------|-------------|
| Magic Link | Auth sign-in | User | "Sign in to FairSplit" |
| Tenant Invite | Owner invites tenant | Tenant | "You've been invited to {propertyName} on FairSplit" |
| New Bill Added | Bill created in open cycle | All property tenants | "New {category} bill added to {propertyName}" |
| Cycle Closed | Cycle status changed to closed | All property tenants | "Billing cycle {cycleLabel} is now closed" |
| Flag Submitted | Tenant submits flag | Property owner | "New flag on {category} bill from {tenantName}" |
| Flag Resolved | Owner resolves/dismisses flag | Flag submitter (tenant) | "Your flag on {category} bill has been {resolved/dismissed}" |

### Template Structure (React Email)

Each template follows a consistent layout:
- FairSplit logo header
- Greeting with user's name
- Body content with relevant details
- Primary CTA button linking to the relevant page
- Footer with unsubscribe link (future) and company info

### Email File Locations

```
lib/email/templates/
  magic-link.tsx
  tenant-invite.tsx
  new-bill.tsx
  cycle-closed.tsx
  flag-submitted.tsx
  flag-resolved.tsx
```

### Send Email Server Action

```typescript
// lib/actions/email.ts
async function sendEmail(params: {
  to: string;
  subject: string;
  template: React.ReactElement;
}): Promise<{ success: boolean; error?: string }>
```

### Dual Delivery Pattern

When a notification-triggering event occurs, the server action:
1. Creates the in-app notification record (always)
2. Sends the email notification (Phase 2, if user has not opted out)

Both operations are wrapped in a try-catch; email failure does not block the in-app notification.

---

## 9. Email Preferences (Future)

### `email_preferences` Column on `profiles` Table

```sql
ALTER TABLE profiles ADD COLUMN email_preferences jsonb DEFAULT '{
  "new_bill": true,
  "cycle_closed": true,
  "flag_submitted": true,
  "flag_resolved": true,
  "payment_reminder": true
}'::jsonb;
```

- Auth emails (magic link) and invite emails cannot be opted out of
- User settings page will display toggle switches for each email type
- Server action checks preferences before sending non-essential emails

---

## 10. Acceptance Criteria

### Phase 1 — In-App Notifications

- [ ] `notifications` table created with proper schema, RLS policies, and indexes
- [ ] Notification bell renders in topbar with accurate unread count badge
- [ ] Notification panel opens on bell click, displays up to 20 recent notifications
- [ ] Unread notifications display bold title and blue indicator dot
- [ ] Clicking a notification marks it as read and navigates to the correct page
- [ ] "Mark all as read" sets all user notifications to read, badge resets to 0
- [ ] `createNotification` is called by bill creation, cycle close, tenant invite, and flag submit actions
- [ ] Empty state displays when user has no notifications
- [ ] Notification bell is keyboard accessible (Enter/Space to open panel, Escape to close)

### Phase 2 — Realtime + Email

- [ ] Supabase Realtime subscription increments bell badge on new notification without page reload
- [ ] Realtime gracefully falls back to polling on connection failure
- [ ] Magic link email sends via Resend and renders correctly in major email clients
- [ ] Tenant invite email contains a valid claim link
- [ ] New bill, cycle closed, flag submitted, and flag resolved emails send to the correct recipients
- [ ] All email templates render with consistent branding and responsive layout
- [ ] Email send failures are logged but do not block the primary server action

---

## 11. Technical Notes

- All notification creation happens server-side via service role to avoid RLS INSERT restrictions on users
- Notification body text should be kept under 200 characters for clean display in the dropdown
- The metadata JSONB column enables flexible deep linking without altering the schema per type
- Supabase Realtime uses WebSocket connections; limit subscription to the single `notifications` table filtered by user ID to minimize connection overhead
- React Email templates should be tested locally with `email dev` script before deployment
- Email rate limiting: Resend free tier allows 100 emails/day, 3000/month; monitor usage during early adoption
- Consider batching notification inserts when closing a cycle (one per tenant per bill could generate many rows)

---

## 12. Out of Scope

- Push notifications (mobile/desktop browser)
- SMS notifications
- Notification preferences UI (Phase 2 settings page)
- Full-page notification history view
- Notification grouping or threading
- Digest emails (daily/weekly summaries)
