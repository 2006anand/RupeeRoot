# RupeeRoot — Build Better Money Habits

RupeeRoot is a full-stack, responsive personal finance and budget planning web application designed for college students and young earners managing limited monthly allowances (default currency: **INR ₹**, default timezone: **Asia/Kolkata**).

## Core & Advanced Features

### Mandatory Features (R1–R5)
- **R1 — Income & Expense Tracking**: Complete CRUD for income and expense records with payment method, date, category, and notes.
- **R2 — Expense & Income Categorization**: Predefined student categories (`Food`, `Travel`, `Shopping`, `Education`, `Entertainment`, `Healthcare`, `Rent`, `Bills`, `Allowance`, `Salary`, `Freelancing`, `Other`) plus custom user-created categories with safe deletion/reassignment protection.
- **R3 — Monthly Budgets**: Overall monthly spending limits and category-wise monthly budgets with uniqueness enforcement and history tracking.
- **R4 — Category-wise Expense Summaries**: Server-aggregated breakdowns, percentage shares, and donut/comparison charts.
- **R5 — Budget Alerts**: Configurable threshold alerts (`75%` warning, `90%` high spending warning, `100%` exceeded) with per-period deduplication so identical alerts are never spammed.

### Advanced Features (P1–P8)
- **P1 — Smart Spending Insights**: Rule-based insight engine surfacing top categories, month-over-month spikes/drops, budget alerts, unusual transactions, and savings cushions.
- **P2 — Budget Forecasting**: Explainable end-of-month spending forecast blending run-rate, recent 7-day pace, and prior-month history, complete with confidence indicators (`LOW`, `MEDIUM`, `HIGH`) and insufficient-data safeguards.
- **P3 — Savings Goals**: Create targets (e.g. laptop, course, emergency fund), add/remove explicit contributions, and track milestone notifications.
- **P4 — Recurring Transactions**: Weekly, monthly, and yearly recurring schedules with idempotent execution (`(recurringId, recurringOccurrenceDate)` unique constraint) via `/api/recurring/process` or on sign-in.
- **P5 — CSV Import**: Upload CSV, map columns, preview row-by-row validation and duplicate checks, and confirm import with a detailed summary.
- **P6 — CSV & PDF Reports**: Export filtered transaction CSVs, category summary CSVs, and formatted monthly PDF financial reports.
- **P7 — Progressive Web App (PWA)**: Web app manifest, custom icons, and service worker for installable desktop/mobile usage.
- **P8 — Financial Wellness Score**: Transparent 100-point score combining Budget Adherence (40), Savings Rate (35), and Spending Consistency (25).

## Architecture

- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Radix UI primitives, Lucide icons, Recharts, React Hook Form + Zod.
- **Backend**: Modular monolithic Next.js REST API route handlers backed by reusable domain services (`src/services/*`).
- **Database**: PostgreSQL + Prisma ORM using `UUID` primary keys and `Decimal(12, 2)` monetary columns.
- **Authentication**: Secure HTTP-only signed JWT session cookies (`jose`) + `bcryptjs` password hashing + route protection middleware.

## Local Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and update `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL`:
   ```bash
   cp .env.example .env
   ```

3. **Run database migrations & generate Prisma client**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Optional — Seed demo student account**:
   ```bash
   npm run db:seed
   ```
   Demo credentials:
   - **Email**: `demo@spendwise.in`
   - **Password**: `SpendWiseDemo@123`

   > Demo data is isolated to this demo account and is never injected into newly registered users.

5. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Testing & Verification

```bash
# Typecheck
npm run typecheck

# Unit tests (financial math, thresholds, forecasting, timezone boundaries)
npm run test:unit

# Integration tests (PostgreSQL CRUD, isolation, budgets, alerts, recurring idempotency)
npm run test:integration

# End-to-end tests (Playwright full user journey + mobile viewport check)
npm run test:e2e
```

## Production & Vercel Deployment

1. Provision a managed PostgreSQL database (Neon, Supabase, RDS, or Vercel Postgres).
2. Set `DATABASE_URL`, `AUTH_SECRET` (32+ random characters), `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `CRON_SECRET` in your deployment environment.
3. Run migrations during release:
   ```bash
   npx prisma migrate deploy
   ```
4. Build and start:
   ```bash
   npm run build
   npm run start
   ```
5. Optionally configure a daily Vercel Cron job calling `POST /api/recurring/process` with `Authorization: Bearer <CRON_SECRET>`.
