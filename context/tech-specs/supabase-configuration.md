# FairSplit Supabase Configuration

> Complete setup guide for Supabase project configuration, environment variables, auth settings,
> storage buckets, realtime, edge functions, local development, and migration workflow.

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Environment Variables](#environment-variables)
3. [Auth Configuration](#auth-configuration)
4. [Storage Bucket Setup](#storage-bucket-setup)
5. [Realtime Configuration](#realtime-configuration)
6. [Edge Functions](#edge-functions)
7. [Local Development with Supabase CLI](#local-development-with-supabase-cli)
8. [Migration Workflow](#migration-workflow)
9. [Client Initialization](#client-initialization)
10. [Security Considerations](#security-considerations)

---

## Project Setup

### 1. Create the Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Select your organization
4. Set the project name to `fairsplit` (or `fairsplit-dev` for development)
5. Choose the database password (store this securely, it is the PostgreSQL password)
6. Select the region closest to your users (e.g., `us-east-1` for US-based)
7. Click "Create new project" and wait for provisioning

### 2. Record the Connection Details

After the project is created, navigate to **Settings > API** and note:

- **Project URL** (`https://<project-ref>.supabase.co`)
- **Anon public key** (safe for client-side use, respects RLS)
- **Service role key** (bypasses RLS, server-side only, never expose to client)

Navigate to **Settings > Database** for:

- **Connection string** (for direct PostgreSQL access and migrations)
- **Connection pooler** (for serverless environments like Vercel Edge Functions)

---

## Environment Variables

### .env.local (for Next.js)

```env
# Supabase - Public (safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase - Secret (server-side only, NEVER prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database - Direct connection (for migrations)
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres

# Resend - Email delivery
RESEND_API_KEY=re_...

# Stripe - Future payment processing (scaffolded)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Claude API - PDF parsing
ANTHROPIC_API_KEY=sk-ant-...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### .env.local.example

Commit an example file without real values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url
RESEND_API_KEY=your_resend_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel Environment Variables

In the Vercel dashboard under **Settings > Environment Variables**, add all of the above
variables. Use the "Production", "Preview", and "Development" scopes as appropriate:

| Variable                            | Production | Preview | Development |
|-------------------------------------|------------|---------|-------------|
| NEXT_PUBLIC_SUPABASE_URL            | Yes        | Yes     | Yes         |
| NEXT_PUBLIC_SUPABASE_ANON_KEY       | Yes        | Yes     | Yes         |
| SUPABASE_SERVICE_ROLE_KEY           | Yes        | Yes     | No          |
| DATABASE_URL                        | Yes        | Yes     | No          |
| RESEND_API_KEY                      | Yes        | Yes     | No          |
| STRIPE_SECRET_KEY                   | Yes        | No      | No          |
| STRIPE_WEBHOOK_SECRET               | Yes        | No      | No          |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  | Yes        | No      | No          |
| ANTHROPIC_API_KEY                   | Yes        | Yes     | No          |
| NEXT_PUBLIC_APP_URL                 | Yes        | Yes     | Yes         |

---

## Auth Configuration

### Email Provider (Magic Link)

FairSplit uses passwordless authentication via magic links (email-based one-time login links).

1. Navigate to **Authentication > Providers** in the Supabase dashboard
2. Ensure **Email** provider is enabled
3. Configure the following settings:

| Setting                       | Value                                   | Notes                                                  |
|-------------------------------|-----------------------------------------|--------------------------------------------------------|
| Enable Email Signup           | ON                                      | Allow new users to sign up                             |
| Enable Email Confirmations    | OFF                                     | Disabled for invite flow (owners pre-create tenants)   |
| Enable Magic Link             | ON                                      | Primary auth method                                    |
| Magic Link OTP Expiry         | 3600 (1 hour)                           | Reasonable window for email delivery                   |
| Minimum Password Length       | N/A                                     | Not using passwords                                    |
| Double confirm email changes  | ON                                      | Security for email updates                             |

### Redirect URLs

Under **Authentication > URL Configuration**:

| Field              | Value                                              |
|--------------------|----------------------------------------------------|
| Site URL           | `https://fairsplit.app` (production)               |
| Redirect URLs      | `http://localhost:3000/auth/callback`               |
|                    | `https://fairsplit.app/auth/callback`               |
|                    | `https://*.vercel.app/auth/callback` (for previews)|

### Email Templates

Under **Authentication > Email Templates**, customize for branding:

**Magic Link Template:**
- Subject: `Sign in to FairSplit`
- Body: Use `{{ .ConfirmationURL }}` variable for the magic link URL

**Invite Template:**
- Subject: `You're invited to FairSplit`
- Body: Custom HTML with `{{ .ConfirmationURL }}` for the claim URL

### Auth Callback Route Handler

The auth callback route exchanges the code for a session:

```
File: app/api/auth/callback/route.ts

Flow:
1. User clicks magic link in email
2. Supabase redirects to /api/auth/callback?code=xxx
3. Route handler exchanges code for session using @supabase/ssr
4. Redirects to dashboard based on user role
```

### JWT Claims

Supabase automatically includes the user's `id` in the JWT. The `role` field from the
`profiles` table is accessed via the `is_admin()` helper function in RLS policies rather
than embedded in the JWT, to avoid stale role data in long-lived tokens.

---

## Storage Bucket Setup

### "bills" Bucket

Used to store uploaded bill PDFs and generated invoice PDFs.

1. Navigate to **Storage** in the Supabase dashboard
2. Create a new bucket named `bills`
3. Set the bucket to **private** (not public)

**Bucket Configuration:**

| Setting          | Value           |
|------------------|-----------------|
| Bucket Name      | `bills`         |
| Public            | No (private)   |
| Allowed MIME Types | `application/pdf` |
| Max File Size    | 10 MB           |

### Storage RLS Policies

```sql
-- Policy: Owners can upload PDFs for their properties
CREATE POLICY "owners_upload_bills"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'bills'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.properties
      WHERE owner_id = auth.uid()
        AND id::text = (storage.foldername(name))[1]
    )
  )
);

-- Policy: Owners and tenants can read bill PDFs for their properties
CREATE POLICY "users_read_own_property_bills"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'bills'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.properties
      WHERE id::text = (storage.foldername(name))[1]
        AND (
          owner_id = auth.uid()
          OR public.is_property_tenant(id)
        )
    )
  )
);

-- Policy: Owners can delete their property bill PDFs
CREATE POLICY "owners_delete_bills"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bills'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.properties
      WHERE owner_id = auth.uid()
        AND id::text = (storage.foldername(name))[1]
    )
  )
);
```

### File Path Convention

Files are stored using the following path structure:

```
bills/{property_id}/{cycle_id}/{bill_id}.pdf
```

Example: `bills/a1b2c3d4.../e5f6g7h8.../i9j0k1l2....pdf`

This structure enables property-level RLS using `storage.foldername()` to extract the
property ID from the path.

---

## Realtime Configuration

Supabase Realtime provides WebSocket-based live updates. FairSplit only enables Realtime on
the `notifications` table to power the notification bell in the dashboard header.

### Enable Realtime

1. Navigate to **Database > Replication** in the Supabase dashboard
2. Under "Realtime", enable the `notifications` table
3. Leave all other tables disabled to minimize resource usage

### Client Subscription

The `useNotifications` hook subscribes to new inserts for the current user:

```typescript
// Pseudocode for lib/hooks/use-notifications.ts
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Add new notification to local state
      // Increment unread count badge
    }
  )
  .subscribe();
```

### Tables NOT Using Realtime

All other tables are updated via server actions with `revalidatePath` / `revalidateTag`
for data freshness. This is intentional to keep the Realtime connection count low and avoid
unnecessary WebSocket traffic.

---

## Edge Functions

FairSplit does not currently require Supabase Edge Functions. All server-side logic runs as
Next.js server actions or API route handlers on Vercel. However, the following scenarios could
justify Edge Functions in the future:

| Scenario                        | Current Approach                | Future Edge Function            |
|---------------------------------|---------------------------------|---------------------------------|
| PDF bill parsing                | Next.js API route + Claude API  | Could move for isolation        |
| Stripe webhook processing       | Next.js API route               | Could move for lower latency    |
| Scheduled bill reminders        | N/A (not implemented)           | Supabase pg_cron + Edge Fn      |
| Email sending                   | Next.js API route + Resend      | Could move for decoupling       |

If Edge Functions are needed, they live in `supabase/functions/`:

```
supabase/
  functions/
    send-reminder/
      index.ts
    process-webhook/
      index.ts
```

Deploy with: `supabase functions deploy send-reminder`

---

## Local Development with Supabase CLI

### Prerequisites

- Docker Desktop running
- Supabase CLI installed: `npm install -g supabase`
- Node.js 18+

### Initial Setup

```bash
# Navigate to the project root
cd "C:\Users\vvrsv\Desktop\Bills Template"

# Initialize Supabase (creates supabase/ directory)
supabase init

# Start local Supabase instance (requires Docker)
supabase start
```

This starts local instances of:
- PostgreSQL (port 54322)
- Auth server (port 54321)
- Storage server
- Realtime server
- Studio dashboard (port 54323)

### Local Environment Variables

After `supabase start`, the CLI outputs local credentials. Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-from-cli-output>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key-from-cli-output>
```

### Local Studio

Access the local Supabase Studio at `http://127.0.0.1:54323` for a GUI to:
- Browse and edit database tables
- Test RLS policies
- Manage auth users
- View storage buckets
- Monitor Realtime connections

### Running the Full Stack Locally

```bash
# Terminal 1: Supabase (leave running)
supabase start

# Terminal 2: Next.js dev server
npm run dev
```

### Stopping Local Supabase

```bash
supabase stop          # Preserves data
supabase stop --no-backup  # Destroys data
```

### Resetting the Local Database

```bash
supabase db reset
```

This drops all tables, re-runs all migrations in order, and re-seeds the database.

---

## Migration Workflow

### Creating a New Migration

```bash
# Generate a new timestamped migration file
supabase migration new create_some_table

# This creates: supabase/migrations/YYYYMMDDHHMMSS_create_some_table.sql
# Edit the file with your SQL
```

### Applying Migrations Locally

```bash
# Reset and re-run all migrations (destructive)
supabase db reset

# Or push only new migrations to the local database
supabase db push
```

### Applying Migrations to Production

```bash
# Link to your remote Supabase project (one-time)
supabase link --project-ref <project-ref>

# Push migrations to the remote database
supabase db push
```

### Diffing Schema Changes

If you make changes via the Studio GUI and want to capture them as a migration:

```bash
# Generate a migration from the diff between local and remote
supabase db diff --use-migra -f my_changes
```

### Migration Best Practices

1. **One concern per migration**: Each migration file should address a single table or feature.
2. **Idempotent where possible**: Use `IF NOT EXISTS`, `CREATE OR REPLACE`, and
   `ON CONFLICT DO NOTHING` for seed data.
3. **Never edit applied migrations**: Once a migration has been pushed to production, create
   a new migration to make changes. Do not modify the original file.
4. **Test locally first**: Always run `supabase db reset` locally and verify before pushing
   to production.
5. **Include RLS in the same migration**: Create the table, enable RLS, and define policies
   in the same file to ensure they are always deployed together.

### Migration File Naming Convention

```
YYYYMMDDHHMMSS_verb_noun.sql
```

Examples:
- `20250101000000_create_profiles.sql`
- `20250115000000_add_avatar_url_to_profiles.sql`
- `20250201000000_create_billing_cycles.sql`
- `20250201000001_seed_575_mckinney_data.sql`

---

## Client Initialization

### Browser Client (for Client Components)

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Server Client (for Server Components & Server Actions)

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

### Admin Client (Service Role, for Server Actions & API Routes)

```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

The admin client bypasses RLS and is used for:
- Writing to `audit_log`
- Creating `notifications` on behalf of other users
- Administrative operations (user management, impersonation)
- Seed data insertion

### Middleware (Session Refresh)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session (important for Server Components)
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith('/auth')
      && !request.nextUrl.pathname.startsWith('/api')
      && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

---

## Security Considerations

### Key Separation

| Key                  | Where Used                              | Exposure Risk       |
|----------------------|-----------------------------------------|---------------------|
| Anon Key             | Browser client, Server Components       | Safe (respects RLS) |
| Service Role Key     | Server Actions, API Routes only         | Must never leak     |

The anon key is safe to expose in `NEXT_PUBLIC_` environment variables because all data
access goes through RLS policies. The service role key bypasses RLS entirely and must only
be used in server-side code.

### RLS as Primary Access Control

Row Level Security is the primary authorization mechanism. Application-level checks in server
actions are a secondary defense layer. Never rely on client-side checks alone.

### Rate Limiting

Supabase provides built-in rate limiting for Auth endpoints (magic link sends). Additional
rate limiting for API routes (PDF parsing, invoice generation) should be implemented at the
Next.js middleware or Vercel Edge level.

### Database Connection Pooling

For serverless deployments on Vercel, use the Supabase connection pooler (Supavisor) instead
of direct connections to avoid exhausting PostgreSQL connection slots:

```env
# Use the pooler URL for serverless
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Sensitive Data Handling

- Never log the service role key
- Never include database credentials in client-side code
- Use Vercel's encrypted environment variables for all secrets
- Rotate the database password periodically via the Supabase dashboard
- The JWT secret is managed by Supabase and should not be manually configured
