create table public.cafes (
 slug text primary key, name text not null, published boolean not null default false
);
create table public.cafe_members (
 cafe_slug text not null references public.cafes(slug) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(cafe_slug,user_id)
);
create index cafe_members_user_idx on public.cafe_members(user_id);
create table public.dishes (
 id text primary key,
 cafe_slug text not null references public.cafes(slug) on delete cascade,
 name text not null, category text not null, description text not null,
 price integer not null check(price>=0), image text not null,
 vegetarian boolean not null, ingredients text[] not null default '{}',
 allergens text[] not null default '{}', portion text not null,
 preparation text not null, model text, tag text not null default '',
 published boolean not null default false, sort_order integer not null default 0,
 model_verified boolean not null default false,
 updated_at timestamptz not null default now()
);
create index dishes_cafe_published_order_idx on public.dishes(cafe_slug,published,sort_order);
alter table public.cafes enable row level security;
alter table public.cafe_members enable row level security;
alter table public.dishes enable row level security;
revoke all on public.cafes,public.cafe_members,public.dishes from anon,authenticated;
grant select on public.cafes,public.dishes to anon,authenticated;
grant select on public.cafe_members to authenticated;
grant insert,update,delete on public.dishes to authenticated;
create policy published_cafes on public.cafes for select to anon,authenticated using(published);
create policy own_memberships on public.cafe_members for select to authenticated using(user_id=(select auth.uid()));
create policy published_dishes on public.dishes for select to anon using(
 published and exists(select 1 from public.cafes c where c.slug=cafe_slug and c.published));
create policy authenticated_dishes_read on public.dishes for select to authenticated using(
 (published and exists(select 1 from public.cafes c where c.slug=cafe_slug and c.published)) or
 exists(select 1 from public.cafe_members m where m.cafe_slug=dishes.cafe_slug and m.user_id=(select auth.uid())));
create policy member_dishes_insert on public.dishes for insert to authenticated with check(
 exists(select 1 from public.cafe_members m where m.cafe_slug=dishes.cafe_slug and m.user_id=(select auth.uid())));
create policy member_dishes_update on public.dishes for update to authenticated using(
 exists(select 1 from public.cafe_members m where m.cafe_slug=dishes.cafe_slug and m.user_id=(select auth.uid()))) with check(
 exists(select 1 from public.cafe_members m where m.cafe_slug=dishes.cafe_slug and m.user_id=(select auth.uid())));
create policy member_dishes_delete on public.dishes for delete to authenticated using(
 exists(select 1 from public.cafe_members m where m.cafe_slug=dishes.cafe_slug and m.user_id=(select auth.uid())));

