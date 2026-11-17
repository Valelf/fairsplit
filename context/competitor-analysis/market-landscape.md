# FairSplit Competitor & Market Landscape Analysis

## Overview

FairSplit operates at the intersection of property management, expense splitting, and utility billing. No existing product directly addresses the niche of fair, person-days-based utility bill splitting for shared housing. This document analyzes the competitive landscape and articulates FairSplit's differentiation.

---

## Competitor 1: Splitwise

### Overview
Splitwise is a general-purpose expense splitting app used by roommates, friends, and travel groups to track shared expenses and settle debts.

### Strengths
- Large established user base (millions of users)
- Simple, intuitive UI for adding and splitting expenses
- Supports multiple split methods (equal, percentage, exact amounts)
- Cross-platform (iOS, Android, web)
- Integration with payment services (Venmo, PayPal)

### Weaknesses
- **No property management features**: Cannot model properties, landlords, or tenants
- **No person-days calculation**: Only supports equal or manual percentage splits
- **No proration for move-in/move-out**: Cannot handle partial month occupancy
- **No billing cycle concept**: Expenses are standalone, not grouped into cycles
- **No document management**: Cannot attach or parse utility bill PDFs
- **No transparency features**: Tenants cannot verify how their share was calculated
- **No landlord/tenant role distinction**: All users are equal peers

### Pricing
- Free tier with ads
- Splitwise Pro: $4.99/month (ad-free, receipt scanning, charts)

### Target Market
- Roommates, travel groups, couples sharing expenses
- Casual, peer-to-peer expense tracking

### How FairSplit Differentiates
- Person-days algorithm for provably fair splitting based on actual occupancy
- Property-level management with landlord/tenant role hierarchy
- Billing cycles that group related bills together
- PDF parsing for automated bill data entry
- Full transparency: tenants can drill into every calculation
- Proration for partial month tenants automatically handled

---

## Competitor 2: Zillow Rental Manager

### Overview
Zillow Rental Manager is a property management platform focused on listing rental properties, screening tenants, and collecting rent online.

### Strengths
- Massive brand recognition and user base
- Comprehensive tenant screening (credit checks, background checks)
- Online rent collection with ACH payments
- Lease management and document storage
- Maintenance request tracking

### Weaknesses
- **No utility bill splitting**: Focused entirely on rent, not utilities
- **No shared housing model**: Designed for traditional one-tenant-per-unit rentals
- **No bill parsing or calculation engine**: No way to input and split utility costs
- **No person-days or proration logic**: Not built for shared occupancy scenarios
- **Overkill for shared housing**: Feature set targets traditional landlords with multiple units

### Pricing
- Free for landlords (monetized through tenant screening fees)
- Tenant screening: $35 per applicant

### Target Market
- Individual landlords with 1-10 rental units
- Traditional one-lease-per-unit rentals

### How FairSplit Differentiates
- Built specifically for shared housing utility splitting
- Person-days calculation engine is the core product, not an add-on
- Lightweight and focused vs. bloated property management
- Tenants are active participants, not just rent-payers

---

## Competitor 3: RentManager

### Overview
RentManager is an enterprise-grade property management software used by large property management companies to manage portfolios of hundreds or thousands of units.

### Strengths
- Comprehensive property management (accounting, maintenance, leasing)
- Robust reporting and analytics
- Multi-property portfolio management
- Integration with accounting software (QuickBooks, etc.)
- Customizable workflows

### Weaknesses
- **Expensive**: Pricing starts at $200+/month, scales with units
- **Complex**: Requires training and onboarding; steep learning curve
- **Not designed for shared housing**: Assumes one lease per unit
- **No utility splitting logic**: Utilities are either included in rent or billed separately
- **No tenant-facing transparency**: Tenants do not interact with the platform
- **Overkill**: Designed for 50+ unit portfolios, not a single shared house

### Pricing
- Custom pricing based on portfolio size
- Typically $1-3 per unit per month for large portfolios
- Minimum commitment of $200+/month

### Target Market
- Property management companies with large portfolios
- Multi-family apartment complexes
- Commercial property managers

### How FairSplit Differentiates
- Accessible pricing for individual property owners
- No training required; intuitive for non-technical users
- Purpose-built for shared housing utility billing
- Tenant-facing dashboard with full transparency
- Simple setup in minutes, not weeks

---

## Competitor 4: Payment Apps (Zelle, Venmo, PayPal)

### Overview
Peer-to-peer payment apps used for transferring money between individuals. Often used by roommates to settle utility bills after manual calculation.

### Strengths
- Ubiquitous adoption (most people already have accounts)
- Instant or near-instant transfers
- Simple user experience for sending/receiving money
- No fees for basic transfers (Zelle, Venmo standard)

### Weaknesses
- **No calculation logic**: Only handles payment, not splitting
- **No record of why an amount was paid**: No bill context or breakdown
- **No property or tenant management**: Just peer-to-peer money transfer
- **No historical tracking**: Cannot look back and understand why $187.50 was paid in December
- **No fairness verification**: Recipient calculates, payer trusts blindly
- **No dispute resolution**: If a tenant disagrees, there is no framework to resolve it

### Pricing
- Free for standard transfers
- Small fees for instant transfers or credit card funding

### Target Market
- General consumer peer-to-peer payments
- Any scenario requiring money transfer between individuals

### How FairSplit Differentiates
- FairSplit calculates the split; payment apps only transfer money
- FairSplit provides the "why" behind every amount
- Full audit trail tied to actual utility bills and occupancy data
- FairSplit could integrate with payment apps for the actual money transfer (Phase 3)

---

## Competitor 5: Custom Spreadsheets (Google Sheets, Excel)

### Overview
The most common current solution for shared housing utility splitting. Landlords build custom spreadsheets with formulas to calculate each tenant's share.

### Strengths
- Free (or included with existing software subscriptions)
- Fully customizable to any splitting logic
- Familiar tool for most people
- Can be shared with tenants via Google Sheets link
- Historical data preserved in the file

### Weaknesses
- **Error-prone**: Formula errors, copy-paste mistakes, forgotten cell updates
- **Not scalable**: Adding/removing tenants requires restructuring the sheet
- **No proration automation**: Person-days calculation must be done manually each month
- **No tenant-facing experience**: Tenants see a raw spreadsheet, not a polished interface
- **No flagging or dispute workflow**: Tenants must email or text the landlord
- **No document attachment**: Bill PDFs are stored separately from calculations
- **Time-consuming**: Building and maintaining the spreadsheet takes hours monthly
- **Single point of failure**: One wrong formula cascades to all calculations

### Pricing
- Free (Google Sheets) or included with Microsoft 365

### Target Market
- Individual landlords managing shared housing
- This is FairSplit's primary displacement target

### How FairSplit Differentiates
- Automated person-days calculation with zero formula risk
- Professional tenant-facing experience builds trust
- Built-in flagging and dispute resolution workflow
- PDF parsing eliminates manual data entry
- Scalable: adding/removing tenants is a simple form action
- All data, documents, and calculations in one place

---

## Competitive Positioning Matrix

| Feature | Splitwise | Zillow | RentManager | Payment Apps | Spreadsheets | **FairSplit** |
|---------|-----------|--------|-------------|--------------|--------------|---------------|
| Person-days splitting | No | No | No | No | Manual | **Automatic** |
| Proration | No | No | No | No | Manual | **Automatic** |
| Property management | No | Yes | Yes | No | No | **Yes** |
| Tenant portal | No | Limited | No | No | No | **Yes** |
| Bill parsing (PDF) | No | No | No | No | No | **Yes** |
| Billing cycles | No | No | Yes | No | Manual | **Yes** |
| Dispute workflow | No | No | No | No | No | **Yes** |
| Calculation transparency | No | N/A | No | No | Partial | **Full** |
| Invoice generation | No | No | Yes | No | Manual | **Yes** |
| Shared housing focus | Partial | No | No | No | Partial | **100%** |
| Ease of setup | High | Medium | Low | N/A | Medium | **High** |
| Cost | Free/$5/mo | Free | $200+/mo | Free | Free | **Free/$10/mo** |

---

## FairSplit's Unique Value Proposition

**"FairSplit is the only platform that uses a person-days algorithm to provably split utility bills between tenants based on actual occupancy, with full transparency for both landlords and tenants."**

### Core Differentiators

1. **Person-Days Algorithm**: Mathematically fair splitting based on actual days each tenant occupies the property during a billing period. Not equal splits, not manual percentages -- actual occupancy-based proration.

2. **Property-Level Transparency**: Tenants can see exactly how every calculation was made. Every person-day count, every percentage, every dollar amount is visible and verifiable.

3. **AI-Powered Bill Parsing** (Phase 2): Upload a utility bill PDF and the system extracts provider, amount, date range, and account number automatically, reducing manual entry to a quick confirmation.

4. **Built for Shared Housing**: Not a general expense splitter adapted for housing, and not an enterprise property manager scaled down. FairSplit is purpose-built for the specific workflow of splitting utility bills in shared housing.

5. **Dispute Resolution Workflow**: Built-in flagging system that creates a structured path from concern to resolution, reducing landlord-tenant friction.

---

## Market Opportunity

### Target Market Size
- Estimated 17 million shared housing units in the US
- Average 2-5 tenants per shared unit
- Monthly utility costs: $200-600 per property
- Current solutions: 70% spreadsheets, 20% Splitwise-style apps, 10% informal (Venmo requests)

### Go-to-Market Strategy
- Phase 1: Free tier targeting individual landlords replacing spreadsheets
- Phase 2: Premium tier with PDF parsing and advanced analytics
- Phase 3: Payment integration for end-to-end bill-to-payment flow

### Pricing Strategy (Planned)
- **Free**: 1 property, up to 5 tenants, manual bill entry only
- **Pro ($10/month)**: Unlimited properties, PDF parsing, analytics, priority support
- **Business ($25/month)**: Multi-property portfolio, API access, white-label invoices
