+create or replace function public.submit_order(
  p_cafe_slug text,
  p_table_label text,
  p_guest_name text,
  p_notes text,
  p_items jsonb,
  p_request_token uuid
)
returns table(order_id uuid, order_number text, total integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_total integer;
  v_item jsonb;
  v_dish public.dishes%rowtype;
  v_quantity integer;
  v_no_cheese boolean;
begin
  if p_request_token is null then
    raise exception 'A request token is required' using errcode = '22023';
  end if;

  select o.id, o.total into v_order_id, v_total
  from public.orders o where o.request_token = p_request_token;
  if found then
    return query select v_order_id, upper(substr(replace(v_order_id::text, '-', ''), 1, 8)), v_total;
    return;
  end if;
  v_total := 0;

  if not exists (select 1 from public.cafes c where c.slug = p_cafe_slug and c.published) then
    raise exception 'Cafe is unavailable' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_table_label, ''))) not between 1 and 24 then
    raise exception 'Choose a valid table' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_guest_name, ''))) > 60 or char_length(btrim(coalesce(p_notes, ''))) > 300 then
    raise exception 'Order details are too long' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Order must contain between 1 and 20 lines' using errcode = '22023';
  end if;

  insert into public.orders(cafe_slug, request_token, table_label, guest_name, notes)
  values (p_cafe_slug, p_request_token, btrim(p_table_label), btrim(coalesce(p_guest_name, '')), btrim(coalesce(p_notes, '')))
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or jsonb_typeof(v_item->'dish_id') <> 'string'
      or coalesce(v_item->>'quantity', '') !~ '^[0-9]{1,2}$' then
      raise exception 'Invalid order item' using errcode = '22023';
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity not between 1 and 20 then
      raise exception 'Invalid quantity' using errcode = '22023';
    end if;
    if v_item ? 'no_cheese' and jsonb_typeof(v_item->'no_cheese') <> 'boolean' then
      raise exception 'Invalid customization' using errcode = '22023';
    end if;
    v_no_cheese := coalesce((v_item->>'no_cheese')::boolean, false);

    select d.* into v_dish from public.dishes d
    where d.id = v_item->>'dish_id' and d.cafe_slug = p_cafe_slug and d.published;
    if not found then
      raise exception 'A selected dish is unavailable' using errcode = '22023';
    end if;

    insert into public.order_items(order_id, dish_id, dish_name, quantity, unit_price, customizations)
    values (v_order_id, v_dish.id, v_dish.name, v_quantity, v_dish.price, jsonb_build_object('no_cheese', v_no_cheese));
    v_total := v_total + (v_dish.price * v_quantity);
  end loop;

  update public.orders set total = v_total, updated_at = now() where id = v_order_id;
  return query select v_order_id, upper(substr(replace(v_order_id::text, '-', ''), 1, 8)), v_total;
end;
$$;

revoke execute on function public.submit_order(text,text,text,text,jsonb,uuid) from public;
grant execute on function public.submit_order(text,text,text,text,jsonb,uuid) to anon, authenticated;
