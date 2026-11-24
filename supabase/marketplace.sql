-- =============================================================
-- FJCU imMBA — role-based C2C marketplace (AI-ADPD class #10)
-- Run in the Supabase SQL Editor after schema.sql and alumni.sql.
--
-- Four roles, one database:
--   visitor         not signed in  → may only browse active listings
--   buyer           any signed-in user → cart, orders, order history
--   seller          seller_status = 'approved' → listings, inventory,
--                   confirm payment, ship, sales records
--   platform admin  admin_profiles.role in (admin, super_admin)
--                   → sees every transaction, but cannot edit them
--
-- The interface in marketplace.html changes with the role; these
-- policies are what actually enforces it, so a role cannot be
-- faked from the browser.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Shop profiles: the marketplace identity of a user
-- -------------------------------------------------------------
create table if not exists public.shop_profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  display_name  text,
  shop_name     text,
  seller_status text not null default 'none'
                check (seller_status in ('none', 'pending', 'approved', 'suspended')),
  requested_at  timestamptz,
  approved_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- Every new signup gets both a back-office profile (pending) and a
-- shop profile (buyer straight away, seller only once approved).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  insert into public.shop_profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Backfill the users that registered before this file existed.
insert into public.shop_profiles (id, email, display_name)
select p.id, p.email, p.full_name from public.admin_profiles p
on conflict (id) do nothing;

-- Approved sellers only. security definer, like is_admin(), so the
-- policies below do not recurse into shop_profiles.
create or replace function public.is_seller()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shop_profiles
    where id = auth.uid() and seller_status = 'approved'
  );
$$;

-- -------------------------------------------------------------
-- 2. Products (slide 6: what a seller must be able to list)
-- -------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  category    text not null default 'Other'
              check (category in ('Textbooks', 'Electronics', 'Furniture',
                                  'Dorm & kitchen', 'Clothing', 'Bicycles',
                                  'Tickets & services', 'Other')),
  description text,
  price       numeric(10, 2) not null check (price >= 0),   -- NT$
  quantity    integer not null default 1 check (quantity >= 0), -- available stock
  sold_count  integer not null default 0 check (sold_count >= 0),
  image_url   text,
  status      text not null default 'active'
              check (status in ('draft', 'active', 'hidden')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists products_seller_idx on public.products (seller_id);
create index if not exists products_browse_idx on public.products (status, created_at desc);

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- -------------------------------------------------------------
-- 3. Orders and order items (slides 9–13)
--    One order per seller, so each seller only ever sees and
--    handles their own transaction.
--    Buyer and seller names are copied onto the order: a business
--    record must still read correctly years later, even if the
--    product or the profile changes.
-- -------------------------------------------------------------
create sequence if not exists public.order_no_seq;

create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  order_no     text unique not null
               default 'IM' || to_char(now(), 'YYMMDD') || '-' ||
                       lpad(nextval('public.order_no_seq')::text, 4, '0'),
  buyer_id     uuid not null references auth.users (id),
  seller_id    uuid not null references auth.users (id),
  buyer_name   text,
  buyer_email  text,
  seller_name  text,
  seller_shop  text,
  status       text not null default 'awaiting_payment'
               check (status in ('awaiting_payment', 'ready_to_ship',
                                 'shipped', 'completed', 'cancelled')),
  total        numeric(10, 2) not null default 0,
  item_count   integer not null default 0,
  buyer_note   text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  shipped_at   timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_seller_idx on public.orders (seller_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_id   uuid references public.products (id) on delete set null,
  product_name text not null,          -- snapshot
  category     text,
  unit_price   numeric(10, 2) not null,-- snapshot
  quantity     integer not null check (quantity > 0),
  subtotal     numeric(10, 2) not null
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- -------------------------------------------------------------
-- 4. Placing an order (slide 9)
--    Everything that must not be trusted to the browser happens
--    here: stock is locked and re-checked, prices are read from
--    the database, and the cart is split into one order per seller.
-- -------------------------------------------------------------
create or replace function public.rpc_place_order(p_items jsonb, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer      uuid := auth.uid();
  buyer_row  public.shop_profiles;
  item       jsonb;
  prod       public.products;
  qty        integer;
  seller     uuid;
  seller_row public.shop_profiles;
  v_order    uuid;
  created    jsonb := '[]'::jsonb;
  sellers    uuid[];
begin
  if buyer is null then
    raise exception 'You have to sign in before placing an order.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  select * into buyer_row from public.shop_profiles where id = buyer;

  -- which sellers are in this cart
  select array_agg(distinct pr.seller_id)
    into sellers
    from jsonb_array_elements(p_items) i
    join public.products pr on pr.id = (i ->> 'product_id')::uuid;

  if sellers is null then
    raise exception 'None of the products in your cart exist any more.';
  end if;

  foreach seller in array sellers loop
    select * into seller_row from public.shop_profiles where id = seller;

    insert into public.orders (buyer_id, seller_id, buyer_name, buyer_email,
                               seller_name, seller_shop, buyer_note)
    values (buyer, seller,
            coalesce(buyer_row.display_name, buyer_row.email), buyer_row.email,
            coalesce(seller_row.display_name, seller_row.email),
            coalesce(seller_row.shop_name, seller_row.display_name, seller_row.email),
            nullif(trim(coalesce(p_note, '')), ''))
    returning id into v_order;

    for item in select * from jsonb_array_elements(p_items) loop
      -- lock the row so two buyers cannot take the same last unit
      select * into prod from public.products
       where id = (item ->> 'product_id')::uuid for update;

      if prod.id is null then raise exception 'A product in your cart no longer exists.'; end if;
      if prod.seller_id <> seller then continue; end if;

      qty := greatest(1, coalesce((item ->> 'quantity')::integer, 1));

      if prod.status <> 'active' then
        raise exception 'Not on sale any more: %', prod.name;
      end if;
      if prod.quantity < qty then
        raise exception 'Only % left of %', prod.quantity, prod.name;
      end if;

      insert into public.order_items (order_id, product_id, product_name, category,
                                      unit_price, quantity, subtotal)
      values (v_order, prod.id, prod.name, prod.category, prod.price, qty, prod.price * qty);

      -- Available stock = current inventory − purchased quantity (slide 7)
      -- A listing with no stock left stays visible, marked "sold out",
      -- so the record of what was sold does not disappear.
      update public.products
         set quantity = quantity - qty,
             sold_count = sold_count + qty
       where id = prod.id;
    end loop;

    update public.orders o
       set total = (select coalesce(sum(subtotal), 0) from public.order_items oi where oi.order_id = o.id),
           item_count = (select coalesce(sum(quantity), 0) from public.order_items oi where oi.order_id = o.id)
     where o.id = v_order;

    created := created || jsonb_build_array(
      (select jsonb_build_object('id', o.id, 'order_no', o.order_no, 'total', o.total,
                                 'seller', o.seller_shop, 'status', o.status)
         from public.orders o where o.id = v_order));
  end loop;

  return created;
end;
$$;

-- -------------------------------------------------------------
-- 5. The order lifecycle (slide 11)
--    Waiting for payment → Ready to ship → Shipped → Completed
--    The function is the only way to change a status, so no step
--    can be skipped and nobody can act on somebody else's order.
--    Cancelling is only possible before payment is confirmed, and
--    it puts the stock back.
-- -------------------------------------------------------------
create or replace function public.rpc_advance_order(p_order_id uuid, p_to text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me   uuid := auth.uid();
  o    public.orders;
  item public.order_items;
begin
  if me is null then raise exception 'You have to sign in.'; end if;

  select * into o from public.orders where id = p_order_id for update;
  if o.id is null then raise exception 'Order not found.'; end if;
  if me <> o.buyer_id and me <> o.seller_id then
    raise exception 'This is not your order.';
  end if;

  if p_to = 'ready_to_ship' then
    if o.status <> 'awaiting_payment' then raise exception 'Payment can only be confirmed while the order is waiting for payment.'; end if;
    if me <> o.seller_id then raise exception 'Only the seller confirms that the payment arrived.'; end if;
    update public.orders set status = 'ready_to_ship', paid_at = now() where id = o.id;

  elsif p_to = 'shipped' then
    if o.status <> 'ready_to_ship' then raise exception 'An order can only be shipped after the payment is confirmed.'; end if;
    if me <> o.seller_id then raise exception 'Only the seller ships the order.'; end if;
    update public.orders set status = 'shipped', shipped_at = now() where id = o.id;

  elsif p_to = 'completed' then
    if o.status <> 'shipped' then raise exception 'An order is completed after it has been shipped.'; end if;
    update public.orders set status = 'completed', completed_at = now() where id = o.id;

  elsif p_to = 'cancelled' then
    if o.status <> 'awaiting_payment' then
      raise exception 'Only an order that is still waiting for payment can be cancelled. Completed transactions are kept as business records.';
    end if;
    -- give the stock back
    for item in select * from public.order_items where order_id = o.id loop
      if item.product_id is not null then
        update public.products
           set quantity = quantity + item.quantity,
               sold_count = greatest(0, sold_count - item.quantity)
         where id = item.product_id;
      end if;
    end loop;
    update public.orders set status = 'cancelled', cancelled_at = now() where id = o.id;

  else
    raise exception 'Unknown status: %', p_to;
  end if;

  select * into o from public.orders where id = p_order_id;
  return jsonb_build_object('order_no', o.order_no, 'status', o.status);
end;
$$;

-- -------------------------------------------------------------
-- 6. Becoming a seller (slide 4: an approved seller)
-- -------------------------------------------------------------
create or replace function public.rpc_request_seller(p_shop_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  s  public.shop_profiles;
begin
  if me is null then raise exception 'You have to sign in.'; end if;
  select * into s from public.shop_profiles where id = me;
  if s.seller_status = 'approved' then return jsonb_build_object('seller_status', 'approved'); end if;
  if s.seller_status = 'suspended' then raise exception 'Your shop is suspended. Contact the platform administrator.'; end if;

  update public.shop_profiles
     set shop_name = nullif(trim(coalesce(p_shop_name, '')), ''),
         seller_status = 'pending',
         requested_at = now()
   where id = me;

  return jsonb_build_object('seller_status', 'pending');
end;
$$;

-- -------------------------------------------------------------
-- 7. Activity log for the marketplace
--    The audit trigger from alumni.sql reads full_name / student_id,
--    so this generic version picks whatever label the table has.
-- -------------------------------------------------------------
create or replace function public.log_audit_any()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor      uuid := auth.uid();
  actor_mail text;
  diff       jsonb := '{}'::jsonb;
  old_j      jsonb;
  new_j      jsonb;
  key        text;
  label      text;
begin
  select email into actor_mail from public.admin_profiles where id = actor;

  if tg_op = 'DELETE' then
    old_j := to_jsonb(old);
    insert into public.audit_log (table_name, record_id, record_label, action, actor_id, actor_email, changes)
    values (tg_table_name, old.id,
            coalesce(old_j ->> 'order_no', old_j ->> 'name', old.id::text),
            'DELETE', actor, actor_mail, old_j);
    return old;
  end if;

  new_j := to_jsonb(new);
  label := coalesce(new_j ->> 'order_no', new_j ->> 'name', new.id::text);

  if tg_op = 'INSERT' then
    insert into public.audit_log (table_name, record_id, record_label, action, actor_id, actor_email, changes)
    values (tg_table_name, new.id, label, 'CREATE', actor, actor_mail, new_j);
    return new;
  end if;

  old_j := to_jsonb(old);
  for key in select jsonb_object_keys(new_j) loop
    if key not in ('updated_at', 'created_at')
       and coalesce(old_j -> key, 'null'::jsonb) is distinct from coalesce(new_j -> key, 'null'::jsonb) then
      diff := diff || jsonb_build_object(key, jsonb_build_object('from', old_j -> key, 'to', new_j -> key));
    end if;
  end loop;

  if diff <> '{}'::jsonb then
    insert into public.audit_log (table_name, record_id, record_label, action, actor_id, actor_email, changes)
    values (tg_table_name, new.id, label, 'UPDATE', actor, actor_mail, diff);
  end if;
  return new;
end;
$$;

drop trigger if exists products_audit on public.products;
create trigger products_audit
  after insert or update or delete on public.products
  for each row execute function public.log_audit_any();

drop trigger if exists orders_audit on public.orders;
create trigger orders_audit
  after insert or update or delete on public.orders
  for each row execute function public.log_audit_any();

-- -------------------------------------------------------------
-- 8. Row level security — the role table, written as policies
-- -------------------------------------------------------------
alter table public.shop_profiles enable row level security;
alter table public.products      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;

-- shop profiles: your own row; platform admins see everyone
drop policy if exists "read own shop profile" on public.shop_profiles;
create policy "read own shop profile"
  on public.shop_profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "update own shop profile" on public.shop_profiles;
create policy "update own shop profile"
  on public.shop_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and seller_status = (
    select seller_status from public.shop_profiles where id = auth.uid()
  ));

-- only a platform admin approves, suspends or reinstates a seller
drop policy if exists "admins manage sellers" on public.shop_profiles;
create policy "admins manage sellers"
  on public.shop_profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- products: a visitor sees active listings, a seller sees all of
-- their own, a platform admin sees everything
drop policy if exists "active listings are public" on public.products;
create policy "active listings are public"
  on public.products for select
  using (status = 'active' or seller_id = auth.uid() or public.is_admin());

drop policy if exists "sellers create their listings" on public.products;
create policy "sellers create their listings"
  on public.products for insert
  with check (seller_id = auth.uid() and public.is_seller());

drop policy if exists "sellers edit their listings" on public.products;
create policy "sellers edit their listings"
  on public.products for update
  using (seller_id = auth.uid() and public.is_seller())
  with check (seller_id = auth.uid());

drop policy if exists "sellers delete their listings" on public.products;
create policy "sellers delete their listings"
  on public.products for delete
  using (seller_id = auth.uid() and public.is_seller());

-- orders: one transaction, three views (slide 12). Nobody writes
-- directly: inserts and status changes go through the functions
-- above, and completed records can never be deleted.
drop policy if exists "buyer seller and admin read orders" on public.orders;
create policy "buyer seller and admin read orders"
  on public.orders for select
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

drop policy if exists "buyer seller and admin read order items" on public.order_items;
create policy "buyer seller and admin read order items"
  on public.order_items for select
  using (exists (
    select 1 from public.orders o
     where o.id = order_items.order_id
       and (o.buyer_id = auth.uid() or o.seller_id = auth.uid() or public.is_admin())
  ));

-- -------------------------------------------------------------
-- 9. Storage bucket for product photos
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images are public" on storage.objects;
create policy "product images are public"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "sellers upload product images" on storage.objects;
create policy "sellers upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_seller());

drop policy if exists "sellers delete product images" on storage.objects;
create policy "sellers delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_seller());

-- -------------------------------------------------------------
-- 10. After running this file
--     Approve yourself as a seller from the back office
--     (Marketplace tab → Sellers), or directly:
--
--     update public.shop_profiles
--        set seller_status = 'approved', approved_at = now()
--      where email = 'you@example.com';
-- =============================================================
