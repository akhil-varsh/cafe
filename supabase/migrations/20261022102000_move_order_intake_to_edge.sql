revoke execute on function public.submit_order(text,text,text,text,jsonb,uuid) from anon, authenticated, public;
alter function public.submit_order(text,text,text,text,jsonb,uuid) rename to submit_order_internal;
alter function public.submit_order_internal(text,text,text,text,jsonb,uuid) security invoker;
revoke execute on function public.submit_order_internal(text,text,text,text,jsonb,uuid) from anon, authenticated, public;
grant execute on function public.submit_order_internal(text,text,text,text,jsonb,uuid) to service_role;
