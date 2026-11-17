# FairSplit Component Library Catalog

## Overview

This document catalogs all planned UI components for FairSplit, organized by atomic design level and functional area. Every custom component builds on top of shadcn/ui primitives and Radix UI accessibility patterns.

---

## UI Primitives (shadcn/ui)

These are the base-level components installed via `npx shadcn-ui@latest add <component>`. They live in `components/ui/` and should not contain business logic.

### Installed Primitives

| Component | Usage | Notes |
|-----------|-------|-------|
| `Button` | All clickable actions | Variants: default, destructive, outline, secondary, ghost, link |
| `Card` | Content containers | Used for metric cards, bill cards, property cards |
| `Dialog` | Modal dialogs | Confirmation dialogs, form dialogs |
| `DropdownMenu` | Context menus | User menu, row action menus |
| `Input` | Text inputs | All form text fields |
| `Label` | Form labels | Always paired with inputs for accessibility |
| `Select` | Dropdowns | Provider selection, status filters |
| `Table` | Data display | Bill tables, tenant lists, split matrices |
| `Tabs` | Tabbed views | Cycle tabs, property settings tabs |
| `Badge` | Status indicators | Tenant status, cycle status, flag status |
| `Separator` | Visual dividers | Between sections in forms and detail views |
| `Sheet` | Side panels | Mobile navigation, detail panels |
| `Skeleton` | Loading states | Shimmer placeholders for all data views |
| `Toast` | Notifications | Success/error messages after actions |
| `Tooltip` | Hover info | Explaining calculations, truncated text |
| `Avatar` | User avatars | Tenant list, user menu |
| `Command` | Command palette | Quick navigation (Phase 2) |
| `Popover` | Floating content | Date pickers, filter panels |
| `Calendar` | Date selection | Cycle date ranges, move-in/move-out dates |
| `ScrollArea` | Scrollable containers | Long tenant lists, bill tables |
| `Progress` | Progress indicators | File upload progress, cycle completion |

---

## Layout Components

Location: `components/layout/`
Level: Organisms (complex, composed of multiple molecules/atoms)

### Sidebar

```
File: components/layout/sidebar.tsx
```

- **Purpose**: Primary navigation for desktop viewports
- **Behavior**: Collapsible (icon-only mode), persistent across pages
- **Props**: `collapsed: boolean`, `onToggle: () => void`
- **Content**:
  - Logo / app name (links to dashboard)
  - Role-based navigation items (different for admin, owner, tenant)
  - Property selector dropdown (owner role only, for multi-property)
  - Collapse/expand toggle at bottom
- **Responsive**: Hidden on mobile (replaced by MobileNav)
- **Dependencies**: Button, Tooltip, Select, Separator

### Topbar

```
File: components/layout/topbar.tsx
```

- **Purpose**: Top navigation bar with breadcrumbs, notifications, and user menu
- **Content**:
  - Mobile menu trigger (hamburger icon, visible on mobile only)
  - Breadcrumbs (auto-generated from current route)
  - Notification bell with unread count badge
  - User avatar dropdown (profile, settings, sign out)
- **Dependencies**: Button, Avatar, DropdownMenu, Badge, Breadcrumbs

### MobileNav

```
File: components/layout/mobile-nav.tsx
```

- **Purpose**: Sheet-based navigation for mobile and tablet viewports
- **Behavior**: Slides in from left when triggered by hamburger menu
- **Content**: Same navigation items as Sidebar, plus property selector
- **Dependencies**: Sheet, Button, Select

### Breadcrumbs

```
File: components/layout/breadcrumbs.tsx
```

- **Purpose**: Show current location in the app hierarchy
- **Behavior**: Auto-generated from the current URL path segments
- **Example**: Dashboard > 575 McKinney > December 2024 Cycle
- **Dependencies**: None (uses native anchor elements)

### RoleGuard

```
File: components/layout/role-guard.tsx
```

- **Purpose**: Client-side role check that wraps protected content
- **Props**: `allowedRoles: UserRole[]`, `fallback?: ReactNode`
- **Behavior**: Checks current user's role, renders children if authorized, shows fallback or redirects if not
- **Note**: This is a UI guard only; actual authorization is enforced by RLS and server actions

---

## Shared Components

Location: `components/shared/`
Level: Molecules and Organisms

### MetricCard

```
File: components/shared/metric-card.tsx
```

- **Purpose**: Display a single KPI metric with optional trend
- **Props**: `icon: LucideIcon`, `label: string`, `value: string | number`, `trend?: { value: number, direction: 'up' | 'down' }`, `loading?: boolean`
- **Layout**: Icon top-left, label below, large value, trend indicator bottom-right
- **Dependencies**: Card, Skeleton, Tooltip

### DataTable

```
File: components/shared/data-table.tsx
```

- **Purpose**: Generic data table wrapper around @tanstack/react-table
- **Features**: Column sorting, text filtering, pagination, row selection, column visibility toggle
- **Props**: `columns: ColumnDef[]`, `data: T[]`, `searchColumn?: string`, `pageSize?: number`
- **Dependencies**: Table, Input, Button, Select, DropdownMenu

### FileUpload

```
File: components/shared/file-upload.tsx
```

- **Purpose**: Drag-and-drop file upload with preview
- **Props**: `accept: string` (e.g., "application/pdf"), `maxSize: number` (bytes), `onUpload: (file: File) => void`, `loading?: boolean`
- **Behavior**: Drag-and-drop zone, click to browse, file preview, upload progress bar
- **Validation**: File type check, file size check, single file only
- **Dependencies**: Card, Button, Progress

### BillSplitTable

```
File: components/shared/bill-split-table.tsx
```

- **Purpose**: The core table showing the person-days split matrix
- **Layout**: Rows = tenants, Columns = bills + total column
- **Cell content**: Dollar amount, person-days count, percentage share
- **Features**: Hover to see calculation detail, highlight row/column on hover, totals row at bottom
- **Props**: `cycle: Cycle`, `bills: Bill[]`, `tenants: Tenant[]`, `splits: BillSplit[]`
- **Dependencies**: Table, Tooltip, CurrencyDisplay

### EmptyState

```
File: components/shared/empty-state.tsx
```

- **Purpose**: Placeholder for screens with no data
- **Props**: `icon: LucideIcon`, `title: string`, `description: string`, `action?: { label: string, onClick: () => void }`
- **Examples**: "No bills yet. Add your first bill to get started." with "Add Bill" button
- **Dependencies**: Button

### LoadingSkeleton

```
File: components/shared/loading-skeleton.tsx
```

- **Purpose**: Shimmer placeholder matching the shape of the content it replaces
- **Variants**: `table`, `cards`, `detail`, `form`
- **Props**: `variant: SkeletonVariant`, `rows?: number`
- **Dependencies**: Skeleton

### DateRangePicker

```
File: components/shared/date-range-picker.tsx
```

- **Purpose**: Select a date range for billing cycles or filtering
- **Props**: `value: { from: Date, to: Date }`, `onChange: (range) => void`, `presets?: DateRangePreset[]`
- **Presets**: "This month", "Last month", "Last 3 months", "Custom"
- **Dependencies**: Popover, Calendar, Button

### CurrencyDisplay

```
File: components/shared/currency-display.tsx
```

- **Purpose**: Format cents (integer) to dollars with proper locale formatting
- **Props**: `amountInCents: number`, `showSign?: boolean`, `className?: string`
- **Output**: "$187.50" (always 2 decimal places, locale-aware thousands separator)
- **Note**: All monetary values in the database are stored in cents; this component handles the conversion at the presentation layer

---

## Owner Components

Location: `components/owner/`
Level: Organisms

### AddBillForm

```
File: components/owner/add-bill-form.tsx
```

- **Purpose**: Manual bill entry form
- **Fields**: Provider (select), amount (currency input), service period start (date), service period end (date), notes (optional textarea)
- **Validation**: Zod schema -- provider required, amount > 0, start date before end date
- **Behavior**: On submit, creates bill and triggers split recalculation
- **Dependencies**: Input, Select, Label, Button, DateRangePicker, Toast

### PdfUploadForm

```
File: components/owner/pdf-upload-form.tsx
```

- **Purpose**: Upload a utility bill PDF for AI-powered parsing
- **Behavior**: Upload file, show parsing progress, display parsed fields for review
- **States**: Idle, uploading, parsing, review, confirmed
- **Dependencies**: FileUpload, Progress, ParsedBillReview

### ParsedBillReview

```
File: components/owner/parsed-bill-review.tsx
```

- **Purpose**: Review and confirm AI-parsed bill data before saving
- **Layout**: Each parsed field shown with its value and a confidence indicator (high/medium/low)
- **Behavior**: Owner can edit any field before confirming; low-confidence fields are highlighted
- **Props**: `parsedData: ParsedBill`, `onConfirm: (data) => void`, `onCancel: () => void`
- **Dependencies**: Input, Select, Badge, Button

### PropertyCard

```
File: components/owner/property-card.tsx
```

- **Purpose**: Summary card for a property in the portfolio view
- **Content**: Property name, address, tenant count, active cycle status, last activity date
- **Behavior**: Clickable to navigate to property detail
- **Dependencies**: Card, Badge, Avatar

### TenantList

```
File: components/owner/tenant-list.tsx
```

- **Purpose**: Manage tenants for a property
- **Columns**: Name, email, move-in date, move-out date (if applicable), status (active/departed/invited)
- **Actions**: Add tenant, edit dates, send invite, remove tenant
- **Dependencies**: DataTable, Badge, Button, Dialog

### CycleTimeline

```
File: components/owner/cycle-timeline.tsx
```

- **Purpose**: Visual timeline showing all billing cycles for a property
- **Layout**: Horizontal timeline with cycle blocks, color-coded by status (open/closed/draft)
- **Behavior**: Click a cycle to navigate to its detail view
- **Dependencies**: Card, Badge, Tooltip

### InviteTenantForm

```
File: components/owner/invite-tenant-form.tsx
```

- **Purpose**: Invite a new tenant to the property via email
- **Fields**: Full name, email address, move-in date, personal message (optional)
- **Validation**: Zod schema -- valid email, name required, move-in date required
- **Behavior**: On submit, creates tenant record (invited status) and sends invite email
- **Dependencies**: Input, Label, Button, Calendar, Toast

---

## Tenant Components

Location: `components/tenant/`
Level: Organisms

### MyShareCard

```
File: components/tenant/my-share-card.tsx
```

- **Purpose**: Summary card showing the tenant's total share for a billing cycle
- **Content**: Total amount, number of bills, person-days count, percentage of total, comparison to last cycle
- **Dependencies**: Card, CurrencyDisplay, Badge, Tooltip

### BillFlagForm

```
File: components/tenant/bill-flag-form.tsx
```

- **Purpose**: Form for tenants to flag a specific bill with a concern
- **Fields**: Reason (select: "Amount seems wrong", "Date range incorrect", "Not my responsibility", "Other"), details (textarea)
- **Validation**: Reason required, details required if "Other" selected
- **Dependencies**: Select, Input, Label, Button, Dialog, Toast

### DownloadInvoiceButton

```
File: components/tenant/download-invoice-button.tsx
```

- **Purpose**: Generate and download a PDF invoice for a billing cycle
- **Behavior**: Click triggers server-side PDF generation, then downloads
- **Props**: `cycleId: string`, `tenantId: string`
- **States**: Idle, generating, downloading, complete
- **Dependencies**: Button, Toast

### BillBreakdownView

```
File: components/tenant/bill-breakdown-view.tsx
```

- **Purpose**: Detailed view of how a single bill is split
- **Content**: Bill total, provider, date range, all tenants' shares with person-days and percentages, visual pie chart of split
- **Props**: `bill: Bill`, `splits: BillSplit[]`, `tenants: Tenant[]`
- **Dependencies**: Card, Table, CurrencyDisplay, Tooltip

---

## Admin Components

Location: `components/admin/`
Level: Organisms

### PlatformStatsCards

```
File: components/admin/platform-stats-cards.tsx
```

- **Purpose**: Grid of metric cards showing platform-wide statistics
- **Metrics**: Total properties, total users, active cycles, open flags, monthly bill volume
- **Dependencies**: MetricCard

### UsersTable

```
File: components/admin/users-table.tsx
```

- **Purpose**: Full user management table with search and filtering
- **Columns**: Name, email, role, property, status, created date, last active
- **Actions**: View detail, impersonate (with audit log), deactivate
- **Dependencies**: DataTable, Badge, Button, DropdownMenu

### PropertiesTable

```
File: components/admin/properties-table.tsx
```

- **Purpose**: All properties on the platform with owner info
- **Columns**: Property name, address, owner name, tenant count, active cycle, last activity
- **Actions**: View detail, contact owner
- **Dependencies**: DataTable, Badge, Button

---

## Component Dependency Graph

```
Page
  └── Template (Layout: Sidebar + Topbar + Content)
        ├── Sidebar (Logo, NavItems, PropertySelector)
        ├── Topbar (Breadcrumbs, NotificationBell, UserMenu)
        └── Content Area
              ├── MetricCard (Card, Skeleton)
              ├── DataTable (Table, Input, Button, Select)
              ├── BillSplitTable (Table, Tooltip, CurrencyDisplay)
              ├── AddBillForm (Input, Select, Label, Button, DateRangePicker)
              ├── MyShareCard (Card, CurrencyDisplay, Badge)
              └── EmptyState (Button)
```

---

## Implementation Priority

| Priority | Components | Phase |
|----------|-----------|-------|
| P0 (MVP) | Button, Card, Table, Input, Label, Select, Badge, Toast, Sidebar, Topbar, BillSplitTable, AddBillForm, CurrencyDisplay, MetricCard, EmptyState | Phase 1 |
| P1 (Core) | DataTable, TenantList, MyShareCard, BillBreakdownView, CycleTimeline, DateRangePicker, Dialog, Tabs | Phase 1 |
| P2 (Enhanced) | FileUpload, PdfUploadForm, ParsedBillReview, BillFlagForm, DownloadInvoiceButton, InviteTenantForm | Phase 2 |
| P3 (Admin) | PlatformStatsCards, UsersTable, PropertiesTable, RoleGuard, Command palette | Phase 2 |
| P4 (Polish) | MobileNav, LoadingSkeleton, Skeleton variants, Tooltip refinements | Phase 2 |
