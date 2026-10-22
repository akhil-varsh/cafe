revoke update on public.orders from authenticated;
grant update(status, updated_at) on public.orders to authenticated;
