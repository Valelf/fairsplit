# FairSplit API Contract Document

> Complete specification of all server actions and API routes, including parameters, return
> types, error cases, and auth requirements.

---

## Table of Contents

1. [Conventions](#conventions)
2. [Server Actions](#server-actions)
   - auth.ts
   - properties.ts
   - tenants.ts
   - cycles.ts
   - bills.ts
   - splits.ts
   - flags.ts
   - notifications.ts
   - admin.ts
3. [API Routes](#api-routes)
   - POST /api/auth/callback
   - POST /api/bills/parse-pdf
   - GET /api/invoices/[cycleId]
   - POST /api/notifications/send
   - POST /api/webhooks/stripe
   - POST /api/admin/impersonate

---

## Conventions

### Server Actions vs API Routes

| Mechanism      | Used For                                          | Auth        |
|----------------|---------------------------------------------------|-------------|
| Server Actions | All data mutations and reads                      | Session     |
| API Routes     | File uploads, webhooks, streaming, external calls | Varies      |

Server actions live in `lib/actions/` and are invoked via `"use server"` functions. They use
the server Supabase client which respects RLS.

API routes live in `app/api/` and handle scenarios that cannot be server actions: file
uploads (multipart forms), webhook receivers (external POST), and streaming responses (PDF
generation).

### Common Return Type

All server actions return a standardized result type:

```typescript
type ActionResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' |
         'CONFLICT' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
};
```

### Validation

All inputs are validated with Zod schemas before processing. Invalid inputs return
`{ success: false, error: "...", code: "VALIDATION_ERROR" }`.

### Monetary Values

All monetary values in the API layer use **cents (integers)**. Conversion to dollars happens
only in the presentation layer (React components).

---

## Server Actions

### lib/actions/auth.ts

#### signInWithMagicLink

Sends a magic link email for passwordless authentication.

```typescript
async function signInWithMagicLink(email: string): Promise<ActionResult<null>>
```

| Parameter | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| email     | string | Yes      | Valid email address        |

**Auth:** None (public action)

**Behavior:**
1. Validates email format with Zod
2. Calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
3. Returns success regardless of whether user exists (prevents email enumeration)

**Errors:**
- `VALIDATION_ERROR`: Invalid email format
- `RATE_LIMITED`: Too many requests (Supabase built-in)

---

#### signOut

Signs out the current user and invalidates their session.

```typescript
async function signOut(): Promise<ActionResult<null>>
```

**Auth:** Authenticated user

**Behavior:**
1. Calls `supabase.auth.signOut()`
2. Redirects to `/auth/login` via `redirect()`

---

#### getCurrentUser

Returns the current user's profile with role information.

```typescript
async function getCurrentUser(): Promise<ActionResult<Profile>>
```

**Auth:** Authenticated user

**Return type:**
```typescript
type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'owner' | 'tenant';
  avatar_url: string | null;
  onboarding_completed: boolean;
};
```

**Errors:**
- `UNAUTHORIZED`: No active session

---

#### updateProfile

Updates the current user's profile fields (not role).

```typescript
async function updateProfile(data: UpdateProfileInput): Promise<ActionResult<Profile>>
```

| Parameter  | Type   | Required | Description              |
|------------|--------|----------|--------------------------|
| full_name  | string | No       | Display name             |
| avatar_url | string | No       | URL to avatar image      |

**Auth:** Authenticated user (can only update own profile)

**Errors:**
- `UNAUTHORIZED`: No active session
- `VALIDATION_ERROR`: Invalid input

---

### lib/actions/properties.ts

#### createProperty

Creates a new property owned by the current user.

```typescript
async function createProperty(data: CreatePropertyInput): Promise<ActionResult<Property>>
```

| Parameter          | Type   | Required | Default          | Description                    |
|--------------------|--------|----------|------------------|--------------------------------|
| name               | string | Yes      |                  | Property display name          |
| address_line1      | string | Yes      |                  | Street address                 |
| address_line2      | string | No       | null             | Apt/Suite number               |
| city               | string | Yes      |                  | City                           |
| state              | string | Yes      |                  | State/Province                 |
| zip_code           | string | Yes      |                  | Postal code                    |
| country            | string | No       | 'US'             | ISO country code               |
| timezone           | string | No       | 'America/Chicago'| IANA timezone                  |
| transparency_level | string | No       | 'full'           | 'full' or 'own_share'         |

**Auth:** Authenticated user with role `owner` or `admin`

**Behavior:**
1. Validates input with Zod
2. Checks subscription plan limits (max_properties)
3. Inserts into `properties` table with `owner_id = auth.uid()`
4. Writes to `audit_log`
5. Calls `revalidatePath('/owner/properties')`

**Errors:**
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: User role is `tenant`
- `VALIDATION_ERROR`: Missing required fields
- `CONFLICT`: Subscription limit exceeded

---

#### updateProperty

Updates an existing property.

```typescript
async function updateProperty(
  propertyId: string,
  data: UpdatePropertyInput
): Promise<ActionResult<Property>>
```

**Auth:** Property owner or admin

**Errors:**
- `FORBIDDEN`: Not the property owner
- `NOT_FOUND`: Property does not exist or soft-deleted

---

#### deleteProperty

Soft-deletes a property by setting `deleted_at`.

```typescript
async function deleteProperty(propertyId: string): Promise<ActionResult<null>>
```

**Auth:** Property owner or admin

**Behavior:**
1. Sets `deleted_at = now()` (does not hard-delete)
2. Preserves all historical billing data

---

#### getProperties

Lists all properties for the current user (filtered by role).

```typescript
async function getProperties(): Promise<ActionResult<Property[]>>
```

**Auth:** Authenticated user
- Admin: sees all properties
- Owner: sees own properties (where `deleted_at IS NULL`)
- Tenant: sees properties they are a tenant of

---

#### getPropertyById

Returns a single property with full details.

```typescript
async function getPropertyById(propertyId: string): Promise<ActionResult<PropertyDetail>>
```

**Return type** includes nested counts: tenant count, cycle count, total billed cents.

**Auth:** Property owner, property tenant, or admin

---

### lib/actions/tenants.ts

#### inviteTenant

Invites a tenant to a property via email. Creates a `property_tenants` record with status
`invited` and generates an invite token.

```typescript
async function inviteTenant(data: InviteTenantInput): Promise<ActionResult<PropertyTenant>>
```

| Parameter    | Type   | Required | Description                          |
|--------------|--------|----------|--------------------------------------|
| property_id  | string | Yes      | UUID of the property                 |
| email        | string | Yes      | Tenant's email address               |
| display_name | string | Yes      | Display name for the tenant          |
| join_date    | string | Yes      | ISO date string (YYYY-MM-DD)         |

**Auth:** Property owner or admin

**Behavior:**
1. Validates input
2. Checks for duplicate email on same property
3. Checks subscription plan limits (max_tenants_per_property)
4. Inserts `property_tenants` record with status `invited`
5. Sends invite email via `/api/notifications/send`
6. Writes to `audit_log`

**Errors:**
- `CONFLICT`: Email already exists for this property
- `FORBIDDEN`: Not the property owner

---

#### preCreateTenant

Creates a tenant record without sending an invite. Used when the owner wants to set up the
property before tenants claim their accounts.

```typescript
async function preCreateTenant(data: PreCreateTenantInput): Promise<ActionResult<PropertyTenant>>
```

Same parameters as `inviteTenant`, but does not send an email. The tenant can claim later
via the invite token URL.

---

#### updateTenant

Updates tenant details (display name, dates).

```typescript
async function updateTenant(
  tenantId: string,
  data: UpdateTenantInput
): Promise<ActionResult<PropertyTenant>>
```

| Parameter    | Type   | Required | Description                     |
|--------------|--------|----------|---------------------------------|
| display_name | string | No       | Updated display name            |
| join_date    | string | No       | Updated join date               |
| leave_date   | string | No       | Set departure date              |

**Auth:** Property owner or admin

**Side Effect:** If `join_date` or `leave_date` changes, triggers recalculation of all
bill splits for cycles that overlap with the affected dates.

---

#### markTenantDeparted

Marks a tenant as departed by setting their `leave_date` and changing status to `departed`.

```typescript
async function markTenantDeparted(
  tenantId: string,
  leaveDate: string
): Promise<ActionResult<PropertyTenant>>
```

**Auth:** Property owner or admin

**Side Effect:** Triggers split recalculation for affected cycles.

---

#### getPropertyTenants

Lists all tenants for a property.

```typescript
async function getPropertyTenants(propertyId: string): Promise<ActionResult<PropertyTenant[]>>
```

**Auth:** Property owner, property tenant (if transparency is `full`), or admin

---

### lib/actions/cycles.ts

#### createCycle

Creates a new billing cycle for a property.

```typescript
async function createCycle(data: CreateCycleInput): Promise<ActionResult<BillingCycle>>
```

| Parameter   | Type   | Required | Default  | Description                   |
|-------------|--------|----------|----------|-------------------------------|
| property_id | string | Yes      |          | UUID of the property          |
| label       | string | Yes      |          | Cycle display name            |
| status      | string | No       | 'draft'  | 'draft', 'open', or 'closed' |

**Auth:** Property owner or admin

---

#### updateCycle

Updates a cycle's label or status.

```typescript
async function updateCycle(
  cycleId: string,
  data: UpdateCycleInput
): Promise<ActionResult<BillingCycle>>
```

**Auth:** Property owner or admin

**Constraint:** Cannot change status from `closed` back to `draft` or `open`.

---

#### closeCycle

Transitions a cycle to `closed` status. Triggers final split calculations and sends
notifications to all tenants.

```typescript
async function closeCycle(cycleId: string): Promise<ActionResult<BillingCycle>>
```

**Auth:** Property owner or admin

**Side Effects:**
1. Sets status to `closed`
2. Runs `calculateAndStoreSplits` for all bills in the cycle
3. Creates notification for each tenant with their total owed
4. Sends email notifications via `/api/notifications/send`

---

#### deleteCycle

Deletes a cycle and all associated bills and splits (cascade).

```typescript
async function deleteCycle(cycleId: string): Promise<ActionResult<null>>
```

**Auth:** Property owner or admin

**Constraint:** Cannot delete a `closed` cycle.

---

#### getCyclesByProperty

Lists all cycles for a property, ordered by created_at descending.

```typescript
async function getCyclesByProperty(propertyId: string): Promise<ActionResult<BillingCycle[]>>
```

**Auth:** Property owner, property tenant, or admin

---

#### getCycleById

Returns a single cycle with nested bill summaries.

```typescript
async function getCycleById(cycleId: string): Promise<ActionResult<CycleDetail>>
```

**Return type** includes: bills array, total_amount_cents, tenant_count, status.

---

### lib/actions/bills.ts

#### createBill

Creates a new bill within a cycle.

```typescript
async function createBill(data: CreateBillInput): Promise<ActionResult<Bill>>
```

| Parameter        | Type    | Required | Default  | Description                           |
|------------------|---------|----------|----------|---------------------------------------|
| cycle_id         | string  | Yes      |          | UUID of the billing cycle             |
| property_id      | string  | Yes      |          | UUID of the property (denormalized)   |
| category         | string  | Yes      |          | 'internet','electricity','water','other' |
| provider         | string  | Yes      |          | Provider company name                 |
| amount_cents     | number  | Yes      |          | Bill amount in cents (integer)        |
| service_start    | string  | Yes      |          | ISO date (YYYY-MM-DD)                 |
| service_end      | string  | Yes      |          | ISO date (YYYY-MM-DD)                 |
| source           | string  | No       | 'manual' | 'manual' or 'pdf_parsed'             |
| pdf_storage_path | string  | No       | null     | Storage path if uploaded              |
| notes            | string  | No       | null     | Optional notes                        |

**Auth:** Property owner or admin

**Side Effect:** Automatically runs `calculateAndStoreSplits` for this bill after creation.

**Errors:**
- `VALIDATION_ERROR`: service_end before service_start, amount_cents <= 0
- `FORBIDDEN`: Cycle is `closed` (cannot add bills to closed cycles)

---

#### updateBill

Updates an existing bill's details.

```typescript
async function updateBill(
  billId: string,
  data: UpdateBillInput
): Promise<ActionResult<Bill>>
```

**Auth:** Property owner or admin

**Side Effect:** Recalculates splits for this bill.

**Constraint:** Cannot update bills in a `closed` cycle.

---

#### deleteBill

Deletes a bill and its associated splits (cascade).

```typescript
async function deleteBill(billId: string): Promise<ActionResult<null>>
```

**Auth:** Property owner or admin

**Constraint:** Cannot delete bills in a `closed` cycle.

---

#### getBillsByCycle

Lists all bills in a cycle with their split summaries.

```typescript
async function getBillsByCycle(cycleId: string): Promise<ActionResult<BillWithSplits[]>>
```

**Return type:**
```typescript
type BillWithSplits = Bill & {
  splits: BillSplit[];
  total_person_days: number;
};
```

**Auth:** Property owner, property tenant, or admin

---

### lib/actions/splits.ts

#### calculateAndStoreSplits

Runs the person-days algorithm for a bill and upserts the results into `bill_splits`.

```typescript
async function calculateAndStoreSplits(billId: string): Promise<ActionResult<BillSplit[]>>
```

**Auth:** Property owner or admin (called internally by bill CRUD actions)

**Behavior:**
1. Fetches the bill from the database
2. Fetches all `property_tenants` for the property
3. Runs the person-days algorithm (see person-days-algorithm-spec.md)
4. Upserts results into `bill_splits` (INSERT ... ON CONFLICT UPDATE)
5. Returns the computed splits

**Important:** This action uses the **service role client** because it needs to write splits
that may reference tenants the current user does not own. The input bill is verified against
the user's ownership first.

---

#### getSplitsByCycle

Returns all splits for all bills in a cycle, organized per-tenant.

```typescript
async function getSplitsByCycle(cycleId: string): Promise<ActionResult<CycleSplitSummary>>
```

**Return type:**
```typescript
type CycleSplitSummary = {
  cycle_id: string;
  total_amount_cents: number;
  per_tenant: {
    tenant_id: string;
    display_name: string;
    total_cents: number;
    per_bill: {
      bill_id: string;
      category: string;
      person_days: number;
      total_person_days: number;
      amount_cents: number;
    }[];
  }[];
};
```

**Auth:** Property owner, property tenant, or admin

**Note:** For tenants, if the property's `transparency_level` is `own_share`, only the
current tenant's splits are returned. If `full`, all tenant splits are returned.

---

#### getSplitsByTenant

Returns all splits for a specific tenant across all cycles.

```typescript
async function getSplitsByTenant(
  tenantId: string,
  propertyId: string
): Promise<ActionResult<TenantSplitHistory>>
```

**Auth:** The tenant themselves, the property owner, or admin

---

### lib/actions/flags.ts

#### createFlag

Creates a new bill flag (dispute/question) from a tenant.

```typescript
async function createFlag(data: CreateFlagInput): Promise<ActionResult<BillFlag>>
```

| Parameter             | Type   | Required | Description                      |
|-----------------------|--------|----------|----------------------------------|
| bill_id               | string | Yes      | UUID of the bill being flagged   |
| property_id           | string | Yes      | UUID of the property             |
| tenant_id             | string | Yes      | UUID of the property_tenant      |
| reason                | string | Yes      | Explanation of the dispute       |
| suggested_amount_cents| number | No       | Tenant's suggested correct amount|

**Auth:** Authenticated tenant who belongs to the property

**Side Effect:** Creates a notification for the property owner.

---

#### resolveFlag

Owner resolves a flag with a resolution note.

```typescript
async function resolveFlag(
  flagId: string,
  resolutionNote: string
): Promise<ActionResult<BillFlag>>
```

**Auth:** Property owner or admin

**Side Effect:** Creates a notification for the tenant who created the flag.

---

#### dismissFlag

Owner dismisses a flag without action.

```typescript
async function dismissFlag(
  flagId: string,
  resolutionNote?: string
): Promise<ActionResult<BillFlag>>
```

**Auth:** Property owner or admin

---

#### getFlagsByProperty

Lists all flags for a property, optionally filtered by status.

```typescript
async function getFlagsByProperty(
  propertyId: string,
  status?: 'open' | 'under_review' | 'resolved' | 'dismissed'
): Promise<ActionResult<BillFlag[]>>
```

**Auth:** Property owner or admin

---

#### getFlagsByTenant

Lists all flags created by a specific tenant.

```typescript
async function getFlagsByTenant(tenantId: string): Promise<ActionResult<BillFlag[]>>
```

**Auth:** The tenant themselves, property owner, or admin

---

### lib/actions/notifications.ts

#### createNotification

Creates an in-app notification for a user. Used internally by other actions.

```typescript
async function createNotification(data: CreateNotificationInput): Promise<ActionResult<Notification>>
```

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| user_id   | string | Yes      | UUID of the notification recipient         |
| type      | string | Yes      | e.g., 'cycle_closed', 'bill_flagged', etc. |
| title     | string | Yes      | Notification title                         |
| body      | string | No       | Notification body text                     |
| metadata  | object | No       | Additional JSON data                       |

**Auth:** Service role (called internally, not directly by users)

---

#### markAsRead

Marks a single notification as read.

```typescript
async function markAsRead(notificationId: string): Promise<ActionResult<null>>
```

**Auth:** Authenticated user (can only mark own notifications)

---

#### markAllAsRead

Marks all of the current user's unread notifications as read.

```typescript
async function markAllAsRead(): Promise<ActionResult<null>>
```

**Auth:** Authenticated user

---

#### getNotifications

Returns notifications for the current user, paginated.

```typescript
async function getNotifications(
  page?: number,
  limit?: number
): Promise<ActionResult<{ notifications: Notification[]; total: number }>>
```

| Parameter | Type   | Required | Default | Description          |
|-----------|--------|----------|---------|----------------------|
| page      | number | No       | 1       | Page number          |
| limit     | number | No       | 20      | Items per page       |

**Auth:** Authenticated user

---

#### getUnreadCount

Returns the count of unread notifications for the current user.

```typescript
async function getUnreadCount(): Promise<ActionResult<number>>
```

**Auth:** Authenticated user

---

### lib/actions/admin.ts

All admin actions require the `admin` role. They use the service role client for operations
that span multiple users and properties.

#### getAllUsers

Lists all platform users with pagination and search.

```typescript
async function getAllUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'admin' | 'owner' | 'tenant';
}): Promise<ActionResult<{ users: Profile[]; total: number }>>
```

**Auth:** Admin only

---

#### updateUserRole

Changes a user's role.

```typescript
async function updateUserRole(
  userId: string,
  role: 'admin' | 'owner' | 'tenant'
): Promise<ActionResult<Profile>>
```

**Auth:** Admin only

**Constraint:** Cannot change own role (safety measure).

---

#### getAllProperties

Lists all properties across all owners with pagination.

```typescript
async function getAllProperties(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ActionResult<{ properties: PropertyWithOwner[]; total: number }>>
```

**Auth:** Admin only

---

#### getAuditLog

Queries the audit log with filters.

```typescript
async function getAuditLog(params: {
  page?: number;
  limit?: number;
  user_id?: string;
  table_name?: string;
  action?: string;
}): Promise<ActionResult<{ entries: AuditLogEntry[]; total: number }>>
```

**Auth:** Admin only

---

#### getPlatformStats

Returns aggregate platform statistics for the admin dashboard.

```typescript
async function getPlatformStats(): Promise<ActionResult<PlatformStats>>
```

**Return type:**
```typescript
type PlatformStats = {
  total_users: number;
  total_owners: number;
  total_tenants: number;
  total_properties: number;
  total_bills: number;
  total_billed_cents: number;
  total_cycles: number;
  active_flags: number;
};
```

**Auth:** Admin only

---

## API Routes

### POST /api/auth/callback

Handles the Supabase auth callback after a user clicks a magic link.

**Request:** Automatic redirect from Supabase (query parameter `code`)

**Response:** Redirect to appropriate dashboard based on user role:
- Admin: `/admin/dashboard`
- Owner: `/owner/dashboard`
- Tenant: `/tenant/dashboard`

**Auth:** None (the callback itself establishes the session)

**Implementation:**
```typescript
// Exchange code for session
const { data, error } = await supabase.auth.exchangeCodeForSession(code);

// Fetch user profile for role-based redirect
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', data.session.user.id)
  .single();
```

---

### POST /api/bills/parse-pdf

Uploads a bill PDF and uses the Claude API to extract structured bill data.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (PDF file, max 10MB), `property_id` (string)

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "Spectrum",
    "category": "internet",
    "amount_cents": 9549,
    "service_start": "2025-09-16",
    "service_end": "2025-10-15",
    "confidence": 0.95,
    "raw_text": "..."
  }
}
```

**Auth:** Authenticated user with owner role for the specified property

**Behavior:**
1. Validates the file (PDF, under 10MB)
2. Uploads to Supabase Storage (`bills/{property_id}/uploads/{filename}`)
3. Extracts text from the PDF
4. Sends to Claude API with structured extraction prompt
5. Returns parsed data for owner review (not auto-saved)
6. Owner reviews and confirms before creating the bill via `createBill`

**Errors:**
- `VALIDATION_ERROR`: Invalid file type or too large
- `INTERNAL_ERROR`: Claude API failure or unreadable PDF

---

### GET /api/invoices/[cycleId]

Generates and streams a PDF invoice for a billing cycle.

**Request:** URL parameter `cycleId`

**Query Parameters:**
- `tenant_id` (optional): Generate invoice for a specific tenant only

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="invoice-{cycleId}.pdf"`
- Streams the generated PDF

**Auth:** Property owner, the specific tenant, or admin

**Behavior:**
1. Fetches cycle, bills, splits, property, and tenant data
2. Generates PDF using `@react-pdf/renderer`
3. Streams the rendered PDF as the response

---

### POST /api/notifications/send

Sends an email notification via the Resend API.

**Request:**
```json
{
  "to": "tenant@example.com",
  "template": "cycle_closed",
  "data": {
    "tenant_name": "Val",
    "cycle_label": "Sept - Oct",
    "total_owed": "$41.59",
    "dashboard_url": "https://fairsplit.app/tenant/dashboard"
  }
}
```

**Auth:** Service role only (called by server actions, not directly by users)

**Templates:**
| Template Name     | When Sent                              |
|-------------------|----------------------------------------|
| magic_link        | User requests login                    |
| tenant_invite     | Owner invites a tenant                 |
| new_bill          | Owner adds a new bill                  |
| cycle_closed      | Owner closes a billing cycle           |
| flag_resolved     | Owner resolves a tenant flag           |
| flag_dismissed    | Owner dismisses a tenant flag          |

---

### POST /api/webhooks/stripe

Handles Stripe webhook events for subscription management.

**Request:** Stripe webhook payload with signature header

**Auth:** Verified via `STRIPE_WEBHOOK_SECRET` signature check

**Handled Events:**

| Event                              | Action                                        |
|------------------------------------|-----------------------------------------------|
| `checkout.session.completed`       | Create/activate user_subscription              |
| `customer.subscription.updated`    | Update subscription status and period dates    |
| `customer.subscription.deleted`    | Set subscription status to 'canceled'          |
| `invoice.payment_failed`           | Set subscription status to 'past_due'          |

**Response:** 200 OK (Stripe requires acknowledgment)

---

### POST /api/admin/impersonate

Starts an impersonation session where an admin can view the app as another user.

**Request:**
```json
{
  "target_user_id": "uuid-of-user-to-impersonate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "impersonation_token": "jwt-token",
    "target_user": {
      "id": "...",
      "email": "...",
      "role": "tenant"
    },
    "expires_at": "2025-01-01T01:00:00Z"
  }
}
```

**Auth:** Admin only

**Behavior:**
1. Verifies current user is admin
2. Generates a short-lived JWT (1 hour) for the target user
3. Writes to audit_log: `{ action: 'impersonate', user_id: admin_id, record_id: target_id }`
4. Client stores the impersonation token and displays an "impersonating" banner
5. All subsequent requests use the impersonation token

**Security:**
- 1-hour expiration
- Full audit trail
- Cannot impersonate other admins
- Impersonation banner always visible to the admin
