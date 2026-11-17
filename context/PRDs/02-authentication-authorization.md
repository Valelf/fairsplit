# PRD 02: Authentication & Authorization

**Version:** 1.0
**Status:** Draft
**Author:** Product Team
**Last Updated:** 2026-02-08
**Dependencies:** PRD 01 (Platform Overview)

---

## 1. Overview

FairSplit uses Supabase Auth with magic link (passwordless email) authentication. The system supports three roles -- admin, owner, and tenant -- each with distinct access levels enforced through middleware, role guard components, and PostgreSQL Row-Level Security (RLS) policies.

## 2. Goals

- Zero-friction authentication: no passwords to remember or manage.
- Role-based access control enforced at every layer (UI, middleware, database).
- Secure tenant onboarding via claim-invite flow.
- Session management handled transparently by Supabase.

## 3. Auth Provider

| Property | Value |
|----------|-------|
| Provider | Supabase Auth |
| Method | Magic Link (email OTP) |
| Session Storage | HTTP-only cookies (managed by `@supabase/ssr`) |
| Token Refresh | Automatic via Supabase middleware helper |
| Email Provider | Supabase built-in (MVP), custom SMTP (Phase 2) |

## 4. Roles & Permissions

| Role | Description | Access Scope |
|------|-------------|-------------|
| `admin` | Platform administrator | Full read/write on all data across all properties |
| `owner` | Property owner/landlord | Full CRUD on own properties, tenants, cycles, bills |
| `tenant` | Tenant in a property | Read-only on own property's billing data (scoped by transparency settings) |

### 4.1 Permission Matrix

| Resource | Admin | Owner | Tenant |
|----------|-------|-------|--------|
| Properties (own) | CRUD | CRUD | Read |
| Properties (others) | Read | None | None |
| Tenants | CRUD | CRUD (own property) | Read (own profile) |
| Billing Cycles | CRUD | CRUD (own property) | Read (own property) |
| Bills | CRUD | CRUD (own property) | Read (own property) |
| Bill Splits | Read | Read (own property) | Read (own share or all, per transparency) |
| User Profiles | CRUD | Read (own tenants) | Read (own profile) |
| PDF Uploads | CRUD | CRUD (own property) | None |
| System Settings | CRUD | None | None |

## 5. Database: Profiles Table

The `profiles` table extends `auth.users` with application-specific fields.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('admin', 'owner', 'tenant')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### 5.1 Profile RLS Policies

| Policy | Operation | Condition |
|--------|-----------|-----------|
| Users can read own profile | SELECT | `auth.uid() = id` |
| Admins can read all profiles | SELECT | `role = 'admin'` (via helper function) |
| Owners can read tenant profiles for their properties | SELECT | Tenant linked to owner's property via `property_tenants` |
| Users can update own profile | UPDATE | `auth.uid() = id` |
| Admins can update any profile | UPDATE | `role = 'admin'` |

## 6. Authentication Flows

### 6.1 Standard Login Flow (Owner / Admin)

```
1. User navigates to /login
2. User enters email address
3. System calls supabase.auth.signInWithOtp({ email })
4. Supabase sends magic link email
5. User clicks magic link in email
6. Browser redirects to /auth/callback
7. /auth/callback route handler:
   a. Exchanges code for session via supabase.auth.exchangeCodeForSession()
   b. Checks if profile exists in profiles table
   c. If no profile: creates profile with role='owner' (default for new signups)
   d. If profile exists: reads existing role
   e. Redirects to role-based dashboard:
      - admin  -> /dashboard/admin
      - owner  -> /dashboard/owner
      - tenant -> /dashboard/tenant
```

### 6.2 Tenant Claim-Invite Flow

```
1. Owner creates tenant record in property (pre-create):
   - Enters tenant name and email
   - System creates property_tenants record with status='invited'
   - System does NOT create auth account yet
2. System sends invite email to tenant with claim link
3. Tenant clicks claim link -> /auth/claim?token=<invite_token>
4. Claim page:
   a. Validates invite token
   b. Calls supabase.auth.signInWithOtp({ email }) to send magic link
   c. Shows "Check your email" message
5. Tenant clicks magic link in email
6. Browser redirects to /auth/callback
7. /auth/callback route handler:
   a. Exchanges code for session
   b. Creates profile with role='tenant'
   c. Updates property_tenants record: status='active'
   d. Links auth user ID to property_tenants record
   e. Redirects to /dashboard/tenant
```

### 6.3 Flow Diagram

```
OWNER LOGIN:
  /login -> enter email -> magic link email -> click link
    -> /auth/callback -> profile check/create -> /dashboard/owner

TENANT CLAIM:
  Owner pre-creates tenant -> invite email sent
    -> /auth/claim?token=xxx -> magic link email -> click link
      -> /auth/callback -> profile create + link -> /dashboard/tenant

RETURNING USER:
  /login -> enter email -> magic link email -> click link
    -> /auth/callback -> profile exists -> /dashboard/{role}
```

## 7. User Stories

### US-AUTH-01: Owner Login
> As an owner, I want to log in with just my email address so that I don't need to manage a password.

**Acceptance Criteria:**
- [ ] Login page shows email input and "Send Magic Link" button.
- [ ] After submitting, user sees confirmation message with instructions to check email.
- [ ] Magic link email arrives within 60 seconds.
- [ ] Clicking the magic link logs the user in and redirects to `/dashboard/owner`.
- [ ] If the user has no profile, one is created with `role='owner'`.
- [ ] If the user already has a profile, existing role is preserved.

### US-AUTH-02: Tenant Claim Account
> As a tenant, I want to claim my account via an invite link so that I can view my bill splits.

**Acceptance Criteria:**
- [ ] Tenant receives an invite email with a claim link.
- [ ] Claim page validates the invite token and shows the tenant's pre-filled email.
- [ ] After claiming, tenant's `property_tenants` status changes from `invited` to `active`.
- [ ] Tenant is redirected to `/dashboard/tenant` after successful claim.
- [ ] If the invite token is expired or invalid, an error message is shown.

### US-AUTH-03: Role-Based Redirect
> As a user, I want to be automatically redirected to my role-specific dashboard after login so that I see the right interface.

**Acceptance Criteria:**
- [ ] Admin users are redirected to `/dashboard/admin`.
- [ ] Owner users are redirected to `/dashboard/owner`.
- [ ] Tenant users are redirected to `/dashboard/tenant`.
- [ ] Accessing a role-mismatched route (e.g., tenant accessing `/dashboard/owner`) shows a 403 or redirects.

### US-AUTH-04: Session Persistence
> As a user, I want my session to persist across page refreshes so that I don't have to log in repeatedly.

**Acceptance Criteria:**
- [ ] Session persists across page refreshes and new tabs.
- [ ] Session automatically refreshes before expiry (handled by Supabase middleware).
- [ ] After session expiry (configurable, default 1 hour), user is redirected to `/login`.

### US-AUTH-05: Logout
> As a user, I want to log out so that my session is terminated securely.

**Acceptance Criteria:**
- [ ] Logout button visible in the dashboard header/sidebar.
- [ ] Clicking logout calls `supabase.auth.signOut()`.
- [ ] User is redirected to `/login` after logout.
- [ ] Session cookies are cleared.
- [ ] Accessing any `/dashboard` route after logout redirects to `/login`.

## 8. Middleware Implementation

### 8.1 Auth Middleware (`middleware.ts`)

```
For every request to /dashboard/*:
  1. Create Supabase server client with cookie handling
  2. Call supabase.auth.getUser() to validate session
  3. If no valid session:
     - Redirect to /login with returnUrl query param
  4. If valid session:
     - Refresh session token (automatic via Supabase)
     - Allow request to proceed
```

### 8.2 Route Protection Rules

| Route Pattern | Auth Required | Allowed Roles |
|---------------|--------------|---------------|
| `/` | No | All |
| `/login` | No | All (redirect if already authenticated) |
| `/auth/callback` | No | All |
| `/auth/claim` | No | All |
| `/dashboard/admin/*` | Yes | admin |
| `/dashboard/owner/*` | Yes | owner, admin |
| `/dashboard/tenant/*` | Yes | tenant, admin |

## 9. Role Guard Component

The `RoleGuard` component wraps dashboard layouts to enforce role-based access at the component level.

```
RoleGuard({ allowedRoles, children }):
  1. Get current user from Supabase session (server component)
  2. Fetch user's role from profiles table
  3. If role not in allowedRoles:
     - If unauthenticated: redirect to /login
     - If wrong role: redirect to correct dashboard or show 403
  4. If role matches: render children
```

### 9.1 Usage Pattern

```
/dashboard/owner/layout.tsx:
  <RoleGuard allowedRoles={['owner', 'admin']}>
    <OwnerDashboardLayout>{children}</OwnerDashboardLayout>
  </RoleGuard>

/dashboard/tenant/layout.tsx:
  <RoleGuard allowedRoles={['tenant', 'admin']}>
    <TenantDashboardLayout>{children}</TenantDashboardLayout>
  </RoleGuard>
```

## 10. RLS Policy Strategy

### 10.1 Helper Function

```sql
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 10.2 Policy Pattern

Every table follows this pattern:

1. **Enable RLS:** `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;`
2. **Admin bypass:** Admin role gets full access via `get_user_role() = 'admin'`.
3. **Owner scoping:** Owner access scoped to rows matching their properties.
4. **Tenant scoping:** Tenant access scoped to rows matching their property membership.

### 10.3 Example: Properties Table

| Policy Name | Operation | Condition |
|-------------|-----------|-----------|
| admin_all_access | ALL | `get_user_role() = 'admin'` |
| owner_select_own | SELECT | `owner_id = auth.uid()` |
| owner_insert_own | INSERT | `owner_id = auth.uid()` |
| owner_update_own | UPDATE | `owner_id = auth.uid()` |
| owner_delete_own | DELETE | `owner_id = auth.uid()` |
| tenant_select_own_property | SELECT | Property linked via `property_tenants` where `user_id = auth.uid()` |

## 11. Session Management

| Property | Value |
|----------|-------|
| Session Duration | 1 hour (configurable in Supabase dashboard) |
| Refresh Token | Automatic rotation, 7-day expiry |
| Cookie Type | HTTP-only, Secure, SameSite=Lax |
| Token Refresh | Middleware calls `getUser()` on every request, triggering automatic refresh |
| Multi-tab Support | Session shared across tabs via cookies |
| Concurrent Sessions | Allowed (no single-session enforcement in MVP) |

## 12. Admin Impersonation (Phase 3)

> **Note:** This feature is planned for Phase 3 and is NOT part of MVP.

- Admin can "view as" any user from the admin dashboard.
- Impersonation creates a read-only session scoped to the target user's permissions.
- All actions during impersonation are logged with `impersonated_by` field.
- Impersonation does not allow write operations.
- Visual indicator (banner) shows when admin is in impersonation mode.

## 13. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Magic link interception | Links are single-use and expire after 1 hour |
| Session hijacking | HTTP-only cookies, HTTPS enforced, SameSite=Lax |
| Role escalation | Role stored server-side in profiles table, enforced by RLS |
| CSRF | SameSite cookie policy, Supabase PKCE flow |
| Rate limiting | Supabase built-in rate limiting on auth endpoints |
| Email enumeration | Generic response for both existing and non-existing emails |

## 14. Technical Notes

- Use `@supabase/ssr` package for server-side cookie management in Next.js App Router.
- Auth callback handler is a Route Handler (`app/auth/callback/route.ts`), not a page.
- Middleware runs on the Edge runtime; keep it lightweight.
- Profile creation in the callback should be idempotent (upsert pattern).
- The `get_user_role()` SQL function should be `SECURITY DEFINER` and `STABLE` for performance.

## 15. Open Questions

1. Should we support social login providers (Google, GitHub) in addition to magic link?
2. What should happen if a tenant's email changes after they've been invited?
3. Should we implement email verification for owners who sign up directly?
4. How long should invite tokens remain valid before expiring?

---

*Next: PRD 03 covers Property and Tenant Management in detail.*
