# 575 McKinney - Utility Bills Dashboard

A modern Next.js application for tracking and splitting utility bills among tenants using a fair day-based calculation system.

## Features

### 📊 Dynamic Billing Cycles
- Create unlimited billing cycles with custom date ranges
- Switch between cycles using intuitive tabs
- Delete cycles when no longer needed

### 💰 Fair Bill Splitting
- **Person-Days Algorithm**: Bills are split based on the number of days each person lived in the property during the billing period
- Supports multiple utility categories: Internet, Electricity, Water, and Other
- Automatic calculation of each person's share based on their occupancy

### 👥 Flexible Tenant Management
- Add/remove tenants with join and leave dates
- Handles move-ins and move-outs mid-billing cycle
- Active residents automatically calculated per billing period

### 📈 Visual Dashboard
- Clean metric cards showing total bills per utility
- Comprehensive breakdown table with:
  - Amount owed per person per utility
  - Days occupied for each billing period
  - Total owed per person
  - Summary row with totals

### 💾 Data Persistence
- Automatic saving to browser localStorage
- Data persists across browser sessions

## How the Calculation Works

### Person-Days Logic

For each bill:
1. The billing period is divided into individual days
2. For each day, we count how many people were actively living there
3. Each person accumulates "person-days" based on their occupancy
4. The total bill is divided proportionally based on person-days

**Example:**
- Bill: $100 for 10 days
- Person A lives all 10 days = 10 person-days
- Person B lives 5 days = 5 person-days
- Total person-days = 15
- Person A owes: $100 × (10/15) = $66.67
- Person B owes: $100 × (5/15) = $33.33

### Join and Leave Dates

- **Join Date**: First day the person is counted in bills
- **Leave Date**: Last day the person is counted (inclusive)
- If no leave date is set, the person is considered active for all future billing periods

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build for Production

```bash
npm run build
npm start
```

## Usage Guide

### Adding a New Billing Cycle

1. Click the **"+ Add Billing Cycle"** button
2. Enter a label (e.g., "Dec – Jan 2025")
3. **Manage People:**
   - Existing tenants are pre-populated
   - Add new tenants with their join date (and optional leave date)
   - Remove tenants who are no longer relevant
4. **Add Bills:**
   - Select category (Internet, Electricity, Water, Other)
   - Enter provider name
   - Enter total amount
   - Set service start and end dates (inclusive)
5. Click **"Create Cycle"**

### Viewing Billing Cycles

- Use the tabs at the top to switch between different billing periods
- Each cycle shows:
  - Metric cards with total bills per utility
  - Detailed breakdown table
  - Per-person calculations

### Deleting a Cycle

- Only newly created cycles can be deleted
- The first 2 initial billing cycles (Sept-Oct and Oct-Nov) are locked 🔒
- For unlocked cycles:
  - Hover over a cycle tab
  - Click the "×" button that appears
  - Confirm deletion

## Data Structure

### People
```typescript
{
  id: string;
  name: string;
  joinDate: string; // ISO format: "2025-09-16"
  leaveDate?: string; // Optional, ISO format
}
```

### Bills
```typescript
{
  id: string;
  category: "internet" | "electricity" | "water" | "other";
  provider: string;
  amount: number;
  serviceStart: string; // ISO format
  serviceEnd: string; // ISO format (inclusive)
}
```

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Storage**: Browser localStorage

## Example Scenarios

### Scenario 1: Mid-Month Move-In
- Divya joins on Oct 16
- For bills dated Oct 1-31:
  - Divya only pays for Oct 16-31 (16 days)
  - Other tenants split Oct 1-15 equally

### Scenario 2: Mid-Month Move-Out
- Anil leaves on Oct 30
- For Nov bills:
  - Anil pays $0 (left before billing period)
  - Remaining tenants split the full bill

### Scenario 3: Overlapping Bill Periods
- Different utilities have different billing cycles
- Each bill is calculated independently
- Totals are summed per person across all bills

## Future Enhancements

Potential features for future versions:
- Export bills to PDF
- Email notifications to tenants
- Payment tracking
- Historical bill analysis
- Multi-property support

## Support

For issues or questions, please contact the property manager.

