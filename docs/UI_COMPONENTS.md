# UI Components & Design System

## Overview

Roony uses a financial professional blue and white theme with shadcn/ui components for a clean, trustworthy interface.

## Design System

### Color Palette

**Primary Blue (Financial Professional)**
- Primary: `#1e40af` (blue-800)
- Primary Dark: `#1e3a8a` (blue-900)
- Primary Light: `#3b82f6` (blue-500)
- Primary Lighter: `#60a5fa` (blue-400)

**Neutrals**
- Background: `#ffffff` (white)
- Surface: `#f8fafc` (slate-50)
- Border: `#e2e8f0` (slate-200)
- Text Primary: `#0f172a` (slate-900)
- Text Secondary: `#64748b` (slate-500)

**Status Colors**
- Success: `#10b981` (emerald-500)
- Warning: `#f59e0b` (amber-500)
- Error: `#ef4444` (red-500)
- Info: `#3b82f6` (blue-500)

### Typography

- **Headings**: Inter, bold
- **Body**: Inter, regular
- **Monospace**: JetBrains Mono (for API keys, IDs)

### Spacing

Using Tailwind's spacing scale (4px base unit).

## Component Structure

```
components/
├── ui/              # shadcn/ui base components
├── dashboard/       # Dashboard-specific components
├── forms/           # Form components
└── layout/          # Layout components
```

## Key Components

### Dashboard Layout

**`components/layout/DashboardLayout.tsx`**
- Sidebar navigation
- Header with user menu
- Main content area
- Responsive mobile menu

### Policy Builder

**`components/forms/PolicyBuilder.tsx`**
- Visual policy creation form
- Rule configuration
- Scope selection (agent/team/project/org)
- Preview policy JSON

### Transaction Table

**`components/dashboard/TransactionTable.tsx`**
- Sortable columns
- Filtering (status, agent, date range)
- Pagination
- Status badges
- Expandable details

### Agent Status Card

**`components/dashboard/AgentStatusCard.tsx`**
- Agent name and ID
- Current status (active/paused)
- Spend metrics
- Quick actions (pause/resume)

### Spend Chart

**`components/dashboard/SpendChart.tsx`**
- Line/bar charts using Recharts
- Time series data
- Breakdown by agent/project/vendor
- Interactive tooltips

### Connect Stripe Button

**`components/dashboard/ConnectStripeButton.tsx`**
- OAuth flow initiation
- Connection status display
- Disconnect option

## Page Structure

### Dashboard Home

- Overview cards (total spend, active agents, transactions today)
- Recent transactions table
- Spend chart (last 30 days)
- Quick actions

### Policies Page

- Policy list with filters
- Create policy button
- Policy cards with status
- Edit/delete actions

### Agents Page

- Agent list
- Create agent button
- Agent cards with status
- Pause/resume actions
- API key management

### Transactions Page

- Transaction table with filters
- Export functionality
- Transaction details modal
- Status filters

### Analytics Page

- Spend over time chart
- Breakdown by agent/project/vendor
- Budget utilization
- Blocked attempts analysis

### Settings Page

- Organization settings
- Stripe connection management
- User management
- API key generation

## Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Collapsible sidebar on mobile
- Stack tables vertically on mobile

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Color contrast ratios meet WCAG AA
- Screen reader friendly

## shadcn/ui Components Used

- Button
- Card
- Table
- Dialog/Modal
- Form (with react-hook-form)
- Input
- Select
- Checkbox
- Radio Group
- Tabs
- Badge
- Alert
- Toast (sonner)
- Dropdown Menu
- Popover
- Tooltip

## Styling Approach

- Tailwind CSS for utility classes
- CSS variables for theme colors
- Component-level styling when needed
- Consistent spacing and typography scale

