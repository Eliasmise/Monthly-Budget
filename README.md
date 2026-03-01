# Expense Logger (Next.js + Supabase)

Production-ready expense logging app with:
- Username-only login
- Expense entry/review/analytics tabs
- Admin management of users, categories, and per-user budget allocations
- Supabase as the only persistence layer

## Stack
- Next.js 14 (App Router), TypeScript
- Tailwind CSS + shadcn/ui-style components
- Supabase Postgres
- Recharts

## 1) Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env template:
   ```bash
   cp .env.example .env.local
   ```
3. Fill `.env.local` values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_SESSION_SECRET`
   - `SEED_ADMIN_USERNAME` (optional, default `admin`)

## 2) Supabase schema + seed
Run SQL from:
- `/supabase/migrations/20260301160000_init.sql`

If you previously used the Sheets version, also run:
- `/supabase/migrations/20260301183000_remove_google_sheets_columns.sql`

For per-user salary/category budgeting, run:
- `/supabase/migrations/20260301195000_add_user_budgeting.sql`

Then run seed script (ensures admin username comes from env):
```bash
npm run seed
```

## 3) Local development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

## 4) Deploy to Vercel
1. Push repo to GitHub.
2. Import project in Vercel.
3. Set all env vars from `.env.example` in Vercel Project Settings.
4. Deploy.

## Auth/session model
- Login endpoint: `POST /api/auth/login` with `{ username }`
- Lookup in `users` table.
- On success, sets signed httpOnly cookie storing:
  - `userId`
  - `username`
  - `role`
  - expiration
- Signed with HMAC SHA-256 using `APP_SESSION_SECRET`.

## Route map
- `/login`
- `/dashboard` (Entry/Review/Analytics tabs)
- `/admin` (admins only)

API routes:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET, POST /api/expenses`
- `PATCH, DELETE /api/expenses/:id`
- `GET, POST /api/categories`
- `PATCH, DELETE /api/categories/:id`
- `GET, POST /api/admin/users`
- `PATCH, DELETE /api/admin/users/:id`
- `GET, PUT /api/admin/budgets`
- `GET /api/budget`

## Notes
- Expense CRUD writes to Supabase only.
- Users can only modify their own expenses; admins can access all users' expenses.
- Categories are dynamic from the database.
- Users can see remaining budget per category in Review based on admin-configured salary and percentages.
