# FairSplit User Journeys

## Overview

This document maps the key user journeys across all roles in FairSplit. Each journey includes the steps, touchpoints, user emotions, pain points, and improvement opportunities. These journeys are based on the personas defined in `user-personas.md`.

---

## Journey 1: Owner First-Time Setup

**Actor**: Shekar (Owner/Landlord)
**Goal**: Set up a property and complete the first billing cycle
**Trigger**: Shekar discovers FairSplit and decides to replace his spreadsheet-based billing

### Steps

| Step | Action | Touchpoint | Emotion | Notes |
|------|--------|------------|---------|-------|
| 1 | Sign up with email/password or Google SSO | Auth page | Hopeful | Must be frictionless |
| 2 | Complete owner profile (name, phone) | Onboarding wizard | Neutral | Keep minimal |
| 3 | Create property (name, address, type) | Property creation form | Engaged | Auto-suggest address |
| 4 | Add tenants (name, email, move-in date) | Tenant management | Focused | Bulk add option helpful |
| 5 | Send invite emails to tenants | Tenant management | Relieved | Confirm sends were successful |
| 6 | Create first billing cycle (start/end dates) | Cycle management | Slightly confused | Pre-fill with common date ranges |
| 7 | Add first bills (manual entry or PDF upload) | Bill entry form | Engaged | PDF parsing saves significant time |
| 8 | Review auto-calculated splits | Split review table | Impressed | "This is exactly what I was doing manually" |
| 9 | Close cycle and notify tenants | Cycle management | Satisfied | One-click close and notify |

### Pain Points
- Step 6: Owners may not understand how cycle dates interact with tenant move-in dates
- Step 7: First-time manual entry may feel tedious without PDF parsing
- Step 8: If splits look wrong, owner needs clear guidance on how to adjust

### Opportunities
- Interactive onboarding tour highlighting key features
- Pre-populate sample data to show what a completed cycle looks like
- Tooltip explanations for person-days calculation during first review
- Progress indicator showing "3 of 5 setup steps complete"

### Success Criteria
- Owner completes setup in under 15 minutes
- First cycle splits are generated without errors
- Owner expresses confidence in the calculation accuracy

---

## Journey 2: Owner Monthly Billing

**Actor**: Shekar (Owner/Landlord)
**Goal**: Process monthly bills and distribute to tenants
**Trigger**: New utility bills arrive (typically mid-month or end of month)

### Steps

| Step | Action | Touchpoint | Emotion | Notes |
|------|--------|------------|---------|-------|
| 1 | Log in and navigate to property | Dashboard | Routine | Should land on active property by default |
| 2 | Open a new billing cycle or continue existing one | Cycle management | Neutral | If previous cycle is open, prompt to close it first |
| 3 | Add bills as they arrive (may span several days) | Bill entry form | Focused | Support incremental bill addition |
| 4 | For each bill: enter provider, amount, date range, or upload PDF | Bill form / PDF upload | Engaged or impatient | PDF parsing drastically reduces friction |
| 5 | Review parsed PDF data (if using upload) | Parsed bill review | Cautious | Must show confidence scores for parsed fields |
| 6 | Review all bills and splits for the cycle | Split review table | Analytical | This is the critical verification moment |
| 7 | Confirm splits are correct | Split review table | Confident | "Looks right" feeling is essential |
| 8 | Close cycle | Cycle management | Relieved | Cannot be undone (warn clearly) |
| 9 | Tenants are notified automatically | Notification system | Satisfied | Confirmation that notifications were sent |

### Pain Points
- Step 3: Bills arrive on different days; the cycle may stay open for a week
- Step 4: Manual entry of multiple bills is repetitive
- Step 5: If PDF parsing confidence is low, owner must manually correct fields
- Step 6: Large split tables (many tenants x many bills) are hard to scan

### Opportunities
- "Quick add" mode for manual bill entry with minimal required fields
- Batch PDF upload for multiple bills at once
- Highlight changes from last cycle (e.g., "Electric bill is 40% higher than last month")
- Summary row showing each tenant's total before closing

### Success Criteria
- Monthly billing takes under 10 minutes for 4-6 bills
- Zero calculation errors
- Tenants receive notifications within 1 minute of cycle close

---

## Journey 3: Tenant Onboarding

**Actor**: Divya (New Tenant)
**Goal**: Create account and understand the billing system
**Trigger**: Receives invite email from Shekar

### Steps

| Step | Action | Touchpoint | Emotion | Notes |
|------|--------|------------|---------|-------|
| 1 | Receive invite email from owner | Email | Curious | Email must clearly explain what FairSplit is |
| 2 | Click "Join Property" link in email | Email link | Slightly anxious | Link must feel trustworthy (branded, HTTPS) |
| 3 | Create account (email pre-filled, set password) | Auth page | Neutral | Social login option reduces friction |
| 4 | See welcome screen with property info | Onboarding | Reassured | "Welcome to 575 McKinney" with owner's name |
| 5 | View brief explanation of person-days billing | Onboarding | Learning | Keep it simple: "You pay based on the days you lived here" |
| 6 | Land on tenant dashboard | Dashboard | Oriented | Show current cycle status or "No bills yet" state |
| 7 | View first bill (when available) | Bill detail | Curious/Verifying | Prorated amount with clear explanation |

### Pain Points
- Step 1: Email may land in spam; tenant may not recognize the sender
- Step 2: Clicking unknown links feels risky
- Step 5: Person-days concept can be confusing without a concrete example
- Step 7: First prorated bill may seem arbitrary without context

### Opportunities
- Allow owner to add a personal message to the invite email
- Include a 30-second explainer animation about person-days on the welcome screen
- Show a concrete example: "If you moved in on the 10th, you pay for 21 out of 31 days"
- Provide a "How is my bill calculated?" help link on every bill view

### Success Criteria
- Tenant completes onboarding in under 3 minutes
- Tenant understands person-days concept after onboarding
- No support questions about proration within first month

---

## Journey 4: Tenant Monthly Review

**Actor**: Navya (Active Tenant)
**Goal**: Review monthly bills and verify her share
**Trigger**: Receives notification that a new cycle is ready

### Steps

| Step | Action | Touchpoint | Emotion | Notes |
|------|--------|------------|---------|-------|
| 1 | Receive notification (email or push) | Notification | Alert | "Your December bills are ready to review" |
| 2 | Open app and navigate to current cycle | Dashboard | Focused | Should land directly on newest cycle |
| 3 | See total amount owed for the cycle | Cycle summary | Evaluating | Compare mentally to last month |
| 4 | Review individual bill breakdowns | Bill detail | Analytical | Person-days math must be transparent |
| 5 | Check person-days calculation | Bill detail | Verifying | "I was here 31 days, total was 145, so my share is 21.4%" |
| 6 | (Optional) Download invoice | Invoice generation | Practical | PDF with all details for records |
| 7 | (Optional) Flag a bill if something seems wrong | Flag form | Concerned | Easy to flag, hard to abuse |
| 8 | Mark cycle as reviewed (acknowledgment) | Cycle summary | Done | Optional but useful for owner visibility |

### Pain Points
- Step 3: No context for whether total is normal or unusual
- Step 4: If there are many bills, scrolling through each one is tedious
- Step 5: Person-days math may need re-explanation monthly
- Step 7: Flagging may feel confrontational

### Opportunities
- Show month-over-month comparison: "Your total is $12.30 more than last month"
- Provide a single-page summary with all bills and shares
- Persistent "How is this calculated?" tooltip
- Frame flagging as "Ask a question" rather than "Report an issue"

### Success Criteria
- Tenant reviews cycle in under 5 minutes
- Tenant can explain their own share calculation
- Flag rate stays below 5% (indicating high trust)

---

## Journey 5: Owner Handling a Flagged Bill

**Actor**: Shekar (Owner/Landlord)
**Goal**: Resolve a tenant's concern about a specific bill
**Trigger**: Receives notification that a tenant flagged a bill

### Steps

| Step | Action | Touchpoint | Emotion | Notes |
|------|--------|------------|---------|-------|
| 1 | Receive flag notification | Email/push | Alert | Include tenant name and bill summary |
| 2 | Open flagged bill detail | Flag review page | Investigative | See tenant's reason alongside bill data |
| 3 | Review the bill amount, date range, and splits | Bill detail | Analytical | Compare to historical averages |
| 4 | Determine if the flag is valid | Mental decision | Decisive | May need to check original bill document |
| 5a | If valid: Correct the bill and recalculate | Bill edit form | Corrective | Recalculation cascades to all tenants |
| 5b | If invalid: Dismiss with explanation | Flag resolution form | Explanatory | Provide a clear, respectful explanation |
| 6 | Tenant is notified of resolution | Notification system | Relieved | Include the resolution and updated amount (if changed) |

### Pain Points
- Step 2: Need full context without switching between multiple screens
- Step 3: May not remember what is "normal" for a given bill
- Step 4: Ambiguous flags (e.g., "seems high") are hard to investigate
- Step 5b: Dismissing a flag may upset the tenant

### Opportunities
- Show bill history alongside the flag for easy comparison
- Attach original bill document (PDF/image) to the bill record
- Provide suggested response templates for common flag reasons
- Track flag resolution time as a metric

### Success Criteria
- Flags resolved within 48 hours
- Resolution includes a clear explanation
- Tenant satisfaction remains high after flag resolution

---

## Journey 6: Admin Platform Monitoring

**Actor**: Alex (Platform Administrator)
**Goal**: Ensure platform health and address issues proactively
**Trigger**: Daily routine check or alert notification

### Steps

| Step | Action | Touchpoint | Emotion | Notes |
|------|--------|------------|---------|-------|
| 1 | Log in to admin dashboard | Admin dashboard | Routine | Auto-redirect based on role |
| 2 | Review platform-wide metrics | Stats cards | Scanning | Active properties, users, open cycles, flags |
| 3 | Check for anomalies or alerts | Alert panel | Vigilant | Bills exceeding historical averages, stale cycles |
| 4 | Drill into specific property if needed | Property detail | Investigative | See all cycles, bills, tenants, flags |
| 5 | Contact owner or tenant if action needed | Communication tools | Supportive | In-app messaging or email |
| 6 | Resolve platform-level issues | Admin tools | Decisive | User management, data corrections |
| 7 | Review daily summary before logging off | Dashboard | Satisfied | "Everything looks healthy" |

### Pain Points
- Step 2: Too many metrics with no clear hierarchy of importance
- Step 3: No automated anomaly detection; must manually spot issues
- Step 4: Deep drilling requires many clicks
- Step 5: Communication tools may be outside the platform

### Opportunities
- Automated daily digest email with key metrics and alerts
- Anomaly detection highlighting properties that need attention
- One-click impersonation to see what a user sees (with audit logging)
- Built-in communication channel for owner/tenant support

### Success Criteria
- Daily review takes under 10 minutes
- Proactive issue detection before users report problems
- All alerts addressed within 24 hours

---

## Journey Map Summary

| Journey | Actor | Frequency | Duration Target | Key Metric |
|---------|-------|-----------|-----------------|------------|
| First-time setup | Owner | One-time | < 15 min | Completion rate |
| Monthly billing | Owner | Monthly | < 10 min | Time to close cycle |
| Tenant onboarding | Tenant | One-time | < 3 min | Drop-off rate |
| Monthly review | Tenant | Monthly | < 5 min | Flag rate |
| Handle flag | Owner | Ad-hoc | < 48 hours | Resolution time |
| Platform monitoring | Admin | Daily | < 10 min | Issues detected proactively |
