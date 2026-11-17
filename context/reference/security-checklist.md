# FairSplit Security Checklist

## Overview

This document is the definitive security checklist for FairSplit. Every item must be verified before a feature is considered production-ready. The checklist covers Row Level Security, authentication, authorization, input validation, data protection, infrastructure security, and compliance.

---

## 1. Row Level Security (RLS)

Supabase RLS policies are the primary access control mechanism. Every table must have policies that enforce role-based data access at the database level.

### RLS Policy Status

| Table | SELECT | INSERT | UPDATE | DELETE | Status |
|-------|--------|--------|--------|--------|--------|
| `profiles` | - [ ] Users can only read their own profile | - [ ] Handled by auth trigger | - [ ] Users can only update their own profile | - [ ] Not allowed | Pending |
| `properties` | - [ ] Owners see their own properties; admins see all | - [ ] Only authenticated users with owner role | - [ ] Only property owner | - [ ] Soft delete only, owner only | Pending |
| `property_members` | - [ ] Members of the property can read | - [ ] Property owner only | - [ ] Property owner only | - [ ] Property owner only | Pending |
| `tenants` | - [ ] Property members can read tenants for their property | - [ ] Property owner only | - [ ] Property owner only | - [ ] Soft delete only, owner only | Pending |
| `billing_cycles` | - [ ] Property members can read cycles for their property | - [ ] Property owner only | - [ ] Property owner only | - [ ] Not allowed once closed | Pending |
| `bills` | - [ ] Property members can read bills for their property | - [ ] Property owner only | - [ ] Property owner only, only on open cycles | - [ ] Property owner only, only on open cycles | Pending |
| `bill_splits` | - [ ] Property members can read splits for their property | - [ ] System-generated only (via server action) | - [ ] System-generated only | - [ ] System-generated only | Pending |
| `flags` | - [ ] Property members can read flags for their property | - [ ] Tenants on the property only | - [ ] Property owner can resolve | - [ ] Not allowed | Pending |
| `invitations` | - [ ] Property owner can read their invitations | - [ ] Property owner only | - [ ] System updates on claim | - [ ] Property owner can cancel | Pending |
| `audit_log` | - [ ] Admin only | - [ ] System-generated only | - [ ] Not allowed (immutable) | - [ ] Not allowed (immutable) | Pending |
| `notifications` | - [ ] Users can read their own notifications | - [ ] System-generated only | - [ ] User can mark as read | - [ ] Not allowed | Pending |

### RLS Verification Steps

- [ ] Every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` applied
- [ ] Every table has at least one policy for each CRUD operation it supports
- [ ] Policies use `auth.uid()` to identify the current user
- [ ] Policies use `auth.jwt() ->> 'role'` or a join to `profiles.role` for role checks
- [ ] `property_id` is denormalized on child tables to enable efficient RLS joins
- [ ] Test each policy by querying as different roles and verifying expected results
- [ ] Test that unauthenticated requests return empty results (not errors)

---

## 2. Authentication

### Middleware Authentication

- [ ] Next.js middleware (`middleware.ts`) checks for a valid Supabase session on all `/dashboard` routes
- [ ] Unauthenticated users are redirected to `/login`
- [ ] Auth callback route (`/auth/callback`) properly exchanges auth codes for sessions
- [ ] Session refresh is handled automatically by `@supabase/ssr`
- [ ] Expired sessions redirect to login with a "session expired" message

### Authentication Flows

- [ ] Email/password sign-up sends confirmation email
- [ ] Email/password sign-in works correctly
- [ ] Google OAuth sign-in works correctly (if enabled)
- [ ] Password reset flow sends email and allows password change
- [ ] Sign-out clears all session data (cookies, localStorage)
- [ ] Invite link claim flow creates account and links to property

### Session Security

- [ ] Session tokens are stored in HTTP-only cookies (not localStorage)
- [ ] Cookie `SameSite` attribute is set to `Lax`
- [ ] Cookie `Secure` attribute is set to `true` in production
- [ ] Session expiry is configured (default: 1 hour access token, 7 day refresh token)
- [ ] Refresh token rotation is enabled

---

## 3. Authorization

### Role-Based Access Control

- [ ] Three roles defined: `admin`, `owner`, `tenant`
- [ ] Role is stored in `profiles.role` (not in JWT custom claims, to allow real-time changes)
- [ ] RoleGuard component prevents rendering unauthorized UI on the client
- [ ] Server actions verify user role before executing mutations
- [ ] API routes verify user role before processing requests

### Route Protection

| Route Pattern | Allowed Roles | Verification |
|--------------|---------------|--------------|
| `/dashboard/admin/*` | admin | - [ ] Verified |
| `/dashboard/properties/*` | owner, admin | - [ ] Verified |
| `/dashboard/my-bills/*` | tenant | - [ ] Verified |
| `/dashboard/settings` | all authenticated | - [ ] Verified |

### Cross-Tenant Isolation

- [ ] Owner A cannot see Owner B's properties
- [ ] Tenant at Property X cannot see bills for Property Y
- [ ] Admin can see all data (for support purposes)
- [ ] URL manipulation (e.g., changing property ID in URL) does not expose other users' data
- [ ] API responses never include data from other properties/users

---

## 4. Input Validation

### Server-Side Validation (Zod)

- [ ] Every server action has a Zod schema that validates all inputs
- [ ] Validation runs before any database query
- [ ] Error messages are user-friendly (no internal details exposed)
- [ ] Monetary amounts are validated as positive integers (cents)
- [ ] Dates are validated as valid ISO 8601 strings
- [ ] String fields have maximum length limits
- [ ] Enum fields are validated against allowed values

### Validation Schemas

| Form/Action | Schema | Status |
|-------------|--------|--------|
| Create property | `createPropertySchema` | - [ ] Defined |
| Add tenant | `addTenantSchema` | - [ ] Defined |
| Create billing cycle | `createCycleSchema` | - [ ] Defined |
| Add bill (manual) | `addBillSchema` | - [ ] Defined |
| Flag bill | `flagBillSchema` | - [ ] Defined |
| Resolve flag | `resolveFlagSchema` | - [ ] Defined |
| Invite tenant | `inviteTenantSchema` | - [ ] Defined |
| Update profile | `updateProfileSchema` | - [ ] Defined |

### File Upload Validation

- [ ] Only PDF files accepted for bill uploads
- [ ] Maximum file size: 10MB
- [ ] File type validated by MIME type, not just extension
- [ ] Files are stored in Supabase Storage with private access
- [ ] File names are sanitized (no path traversal characters)
- [ ] Uploaded files are scanned or validated before processing

---

## 5. Data Protection

### Sensitive Data Handling

- [ ] Passwords are hashed by Supabase Auth (bcrypt, never stored in plaintext)
- [ ] No sensitive data (passwords, tokens) in URL parameters
- [ ] No sensitive data in client-side console.log statements
- [ ] Error messages do not reveal internal system details
- [ ] Database connection strings are never exposed to the client

### API Security

- [ ] SUPABASE_SERVICE_ROLE_KEY is only used in server-side code
- [ ] Service role key is not in any `NEXT_PUBLIC_` variable
- [ ] API routes validate the request origin
- [ ] Rate limiting on compute-intensive endpoints (PDF parsing)
- [ ] Rate limiting on authentication endpoints (login, password reset)

### Invite Token Security

- [ ] Invite tokens are generated with cryptographic randomness (UUID v4 or similar)
- [ ] Invite tokens are single-use (marked as claimed after use)
- [ ] Invite tokens expire after a configurable period (default: 7 days)
- [ ] Claimed tokens cannot be reused
- [ ] Expired tokens return a clear error message, not a system error

---

## 6. Cross-Site Security

### XSS Prevention

- [ ] React's default escaping handles most XSS vectors
- [ ] No use of `dangerouslySetInnerHTML` anywhere in the codebase
- [ ] User-generated content (flag reasons, notes) is always escaped
- [ ] Content Security Policy (CSP) headers are configured
- [ ] External scripts are loaded only from trusted sources with integrity hashes

### CSRF Protection

- [ ] Next.js server actions include built-in CSRF protection via origin checking
- [ ] API routes that accept mutations verify the request origin
- [ ] Cookies use `SameSite=Lax` to prevent cross-site request forgery

### SQL Injection Prevention

- [ ] All database queries use the Supabase client (parameterized queries)
- [ ] No raw SQL string concatenation with user input
- [ ] Database functions (if any) use parameterized inputs
- [ ] Migration files are reviewed for injection vulnerabilities

---

## 7. Infrastructure Security

### Environment Variables

- [ ] All secrets are in `.env.local` (gitignored)
- [ ] `.env.local` is listed in `.gitignore`
- [ ] No secrets are hardcoded in source code
- [ ] Production secrets are managed via Vercel environment variables
- [ ] Only `NEXT_PUBLIC_` prefixed variables are exposed to the client
- [ ] Different secrets for development, staging, and production environments

### HTTPS

- [ ] HTTPS enforced on production (Vercel handles this automatically)
- [ ] HSTS header is set (Vercel default)
- [ ] No mixed content (all resources loaded over HTTPS)

### Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  font-src 'self';
  frame-src 'none';
```

- [ ] CSP header is configured in `next.config.js` or middleware
- [ ] CSP is tested with browser dev tools (no violations)
- [ ] Report-URI is configured for CSP violation monitoring (Phase 2)

### Security Headers

- [ ] `X-Frame-Options: DENY` (prevent clickjacking)
- [ ] `X-Content-Type-Options: nosniff` (prevent MIME sniffing)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 8. Audit and Logging

### Audit Log Requirements

- [ ] Admin impersonation is logged with: admin ID, target user ID, timestamp, action taken
- [ ] All data mutations log: user ID, action type, affected record ID, timestamp
- [ ] Audit log table has immutable RLS (no UPDATE or DELETE allowed)
- [ ] Audit log entries include the IP address (if available from server context)
- [ ] Audit log is queryable by admin for investigation purposes

### Error Logging

- [ ] Server-side errors are logged with full context (not exposed to client)
- [ ] Client-side errors are captured (consider Sentry or similar in Phase 2)
- [ ] Authentication failures are logged
- [ ] RLS policy violations are logged (Supabase handles this)

---

## 9. Dependency Security

### Package Management

- [ ] Run `npm audit` regularly and address critical/high vulnerabilities
- [ ] Lock file (`package-lock.json`) is committed to version control
- [ ] Dependencies are updated regularly (monthly review at minimum)
- [ ] No packages with known critical vulnerabilities in production
- [ ] Dependabot or similar automated dependency updates enabled on GitHub

### Supply Chain

- [ ] Only well-maintained packages with significant community adoption are used
- [ ] shadcn/ui components are vendored (source code in repo, not npm dependency)
- [ ] No unnecessary dependencies (audit for unused packages periodically)

---

## 10. Pre-Launch Security Review

### Checklist Before Going Live

- [ ] All RLS policies are in place and tested (Section 1)
- [ ] Middleware authentication covers all protected routes (Section 2)
- [ ] Role-based access control verified for all three roles (Section 3)
- [ ] All form inputs validated with Zod on the server (Section 4)
- [ ] No secrets exposed to the client (Section 7)
- [ ] HTTPS enforced (Section 7)
- [ ] Security headers configured (Section 7)
- [ ] npm audit shows no critical vulnerabilities (Section 9)
- [ ] Penetration test or security review completed (Phase 2)
- [ ] Backup and recovery procedure tested
- [ ] Incident response plan documented

### Ongoing Security Practices

- [ ] Monthly dependency audit (`npm audit`)
- [ ] Quarterly review of RLS policies
- [ ] Monitor Supabase auth logs for suspicious activity
- [ ] Review and rotate API keys annually
- [ ] Keep Node.js and Next.js updated to latest LTS versions

---

## Appendix: Common Attack Vectors and Mitigations

| Attack | Mitigation | Status |
|--------|-----------|--------|
| SQL Injection | Supabase parameterized queries | - [ ] Verified |
| XSS | React default escaping, no dangerouslySetInnerHTML | - [ ] Verified |
| CSRF | Next.js server actions origin check | - [ ] Verified |
| Broken Authentication | Supabase Auth with session management | - [ ] Verified |
| Broken Access Control | RLS policies + server-side role checks | - [ ] Verified |
| Sensitive Data Exposure | HTTPS, no secrets in client, proper env vars | - [ ] Verified |
| Insecure File Upload | Type/size validation, private storage | - [ ] Verified |
| Privilege Escalation | RLS + server-side role verification | - [ ] Verified |
| IDOR (Insecure Direct Object Reference) | RLS enforces ownership checks on all queries | - [ ] Verified |
| Rate Limiting Bypass | Rate limiting on auth and compute endpoints | - [ ] Verified |
