alter table if exists public.expenses
  drop column if exists sheets_sync_status,
  drop column if exists sheets_sync_error,
  drop column if exists sheets_row_id;
