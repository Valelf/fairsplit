# Project Rules for Claude

## Project Overview

FairSplit — a multi-tenant SaaS platform for fair utility bill splitting between landlords and tenants. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Supabase (PostgreSQL + Auth + Storage).

## Component Architecture (Atomic Design)

Follow atomic design principles when creating UI components:

- **Atoms**: Basic building blocks (buttons, inputs, labels, icons). Single responsibility, no business logic.
- **Molecules**: Simple combinations of atoms (search bar = input + button, form field = label + input + error message).
- **Organisms**: Complex UI sections composed of molecules and atoms (navigation header, card grid, form with validation).
- **Templates**: Page-level layouts that define structure without real content.
- **Pages**: Templates populated with actual data and content.

When asked to build a component, determine its atomic level first and scope accordingly.

## Component Guidelines

- Keep components small and focused on a single responsibility
- Extract reusable patterns into shared components rather than duplicating code
- Props should have sensible defaults
- Avoid hardcoding text — use props or content slots for flexibility
- Components should be self-contained and not depend on external state when possible
- Use shadcn/ui primitives as the base layer for all UI components

## Styling Standards

- Use Tailwind CSS utility classes exclusively — no custom CSS files beyond globals.css
- Follow the shadcn/ui design token system (CSS variables in globals.css)
- Follow consistent spacing scale — do not use arbitrary pixel values
- Ensure all interactive elements have visible focus states
- Support both light and dark themes where applicable
- Mobile-first responsive design using Tailwind breakpoints (sm, md, lg, xl)

## Accessibility Requirements

- All interactive elements must be keyboard accessible
- Images require meaningful alt text
- Form inputs must have associated labels
- Color contrast must meet WCAG AA standards
- Use semantic HTML elements (nav, main, section, article, button, etc.)
- Use Radix UI primitives (via shadcn/ui) for complex interactive patterns (dialogs, dropdowns, etc.)

## File Organization

- Place shared components in `components/` following the structure:
  - `components/ui/` — shadcn/ui primitives
  - `components/layout/` — layout components (sidebar, topbar, breadcrumbs)
  - `components/shared/` — reusable business components used across roles
  - `components/admin/` — admin-specific components
  - `components/owner/` — owner/landlord-specific components
  - `components/tenant/` — tenant-specific components
- Co-locate component tests with the component file
- Use consistent naming: `component-name.tsx` (kebab-case for files)

## Code Standards

- All monetary values stored as integers (cents) in the database, converted to dollars only at the presentation layer
- All dates handled in UTC to avoid timezone issues
- Use Next.js server actions for mutations, API routes only for file uploads, webhooks, and streaming responses
- Use Zod for all form validation and API input validation
- Prefer `revalidatePath`/`revalidateTag` for data freshness after mutations
- Use Supabase RLS (Row Level Security) for all data access control — never rely on client-side checks alone

## Database Conventions

- All tables use UUID primary keys
- Timestamps use `timestamptz` type
- Soft deletes via `deleted_at` column where appropriate
- Denormalize `property_id` on child tables for efficient RLS policies

## Before Committing

- Verify the component renders correctly in the browser
- Check TypeScript compilation passes with no errors
- Ensure no console errors or warnings in the browser
- Test responsive layout at mobile (375px), tablet (768px), and desktop (1280px) breakpoints
- Verify Supabase RLS policies are in place for any new tables
