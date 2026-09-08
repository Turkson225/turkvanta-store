-- Turkvanta: owner-controlled Supabase schema. Run on a new project.
begin;
create extension if not exists pgcrypto with schema extensions;
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,name text not null default '',email text,created_at timestamptz not null default now());
create table public.owner_roles(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create or replace function public.is_owner() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.owner_roles where user_id=auth.uid()) and coalesce(auth.jwt()->>'aal','')='aal2'$$;
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,name,email) values(new.id,coalesce(new.raw_user_meta_data->>'name',''),new.email);return new;end$$;
create trigger profile_created after insert on auth.users for each row execute function public.new_profile();
create table public.categories(slug text primary key,name text not null,created_at timestamptz not null default now());
insert into public.categories values ('tech-audio','Tech & Audio',now()),('home-living','Home & Living',now()),('style-carry','Style & Carry',now()),('everyday-essentials','Everyday Essentials',now());
create table public.products(id uuid primary key default gen_random_uuid(),slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),name text not null,category text references public.categories(slug),price bigint not null check(price>0),image text not null,description text not null default '',colors jsonb not null default '["Default"]',stock integer not null default 0 check(stock>=0),published boolean not null default false,featured boolean not null default false,badge text,specs jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.variants(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id),option text not null,stock integer not null check(stock>=0),reserved integer not null default 0 check(reserved>=0 and reserved<=stock),active boolean not null default true,created_at timestamptz not null default now(),unique(product_id,option));
create table public.addresses(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,label text not null,address text not null,city text not null,phone text not null,created_at timestamptz not null default now());
create table public.saved_items(user_id uuid primary key references auth.users(id) on delete cascade,cart jsonb not null default '[]',wishlist jsonb not null default '[]',created_at timestamptz not null default now());
create table public.store_settings(id text primary key,value jsonb not null default '{}',created_at timestamptz not null default now());
insert into public.store_settings(id,value) values ('main','{"announcement":"A fresh perspective on the everyday.","heroTitle":"Good things.\nGreat everyday.","heroSubtitle":"Discover thoughtful finds for your home, your style, and everything in between.","email":"turkinnovation@gmail.com","phone":"055 459 8191","shippingFee":0,"pickup":false}');
create table public.shipping_zones(id uuid primary key default gen_random_uuid(),name text not null,fee bigint not null check(fee>=0),enabled boolean not null default false,created_at timestamptz not null default now());
create table public.coupons(id uuid primary key default gen_random_uuid(),code text unique not null,percent integer not null check(percent between 1 and 90),minimum bigint not null default 0 check(minimum>=0),max_uses integer not null check(max_uses>0),uses integer not null default 0,reserved integer not null default 0,expires_at timestamptz not null,created_at timestamptz not null default now(),check(uses>=0 and reserved>=0));
create table public.orders(id uuid primary key default gen_random_uuid(),reference text unique not null default 'TV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18)),user_id uuid references auth.users(id) on delete set null,email text not null,address jsonb not null,subtotal bigint not null check(subtotal>=0),discount bigint not null default 0 check(discount>=0),shipping bigint not null default 0 check(shipping>=0),tax bigint not null default 0 check(tax>=0),total bigint not null check(total>0),currency text not null default 'GHS',payment_status text not null default 'pending' check(payment_status in('pending','paid','failed','expired','refunded','reconciliation')),fulfillment_status text not null default 'unfulfilled' check(fulfillment_status in('unfulfilled','processing','shipped','delivered','cancelled')),coupon_id uuid references public.coupons(id),tracking text,guest_hash text,idempotency_key uuid unique not null,request_hash text not null,expires_at timestamptz not null default now()+interval '20 minutes',created_at timestamptz not null default now(),check(total=subtotal-discount+shipping+tax));
create table public.order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),variant_id uuid not null references public.variants(id),product_id uuid not null references public.products(id),name text not null,option text not null,quantity integer not null check(quantity between 1 and 999),unit_price bigint not null check(unit_price>0),created_at timestamptz not null default now());
create table public.inventory_movements(id uuid primary key default gen_random_uuid(),variant_id uuid not null references public.variants(id),order_id uuid references public.orders(id),quantity integer not null,reason text not null,actor uuid references auth.users(id),created_at timestamptz not null default now());
create table public.stock_reservations(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),variant_id uuid not null references public.variants(id),quantity integer not null check(quantity>0),status text not null default 'held' check(status in('held','released','consumed')),created_at timestamptz not null default now(),unique(order_id,variant_id));
create table public.payment_attempts(id uuid primary key default gen_random_uuid(),order_id uuid unique not null references public.orders(id),reference text unique not null,provider_id text,authorization_url text,status text not null default 'initialized',created_at timestamptz not null default now());
create table public.payment_events(id text primary key,order_id uuid references public.orders(id),event text not null,created_at timestamptz not null default now());
create table public.reviews(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products(id),user_id uuid not null references auth.users(id),display_name text not null,rating integer not null check(rating between 1 and 5),body text not null,approved boolean not null default false,created_at timestamptz not null default now(),unique(product_id,user_id));
create table public.return_requests(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),user_id uuid not null references auth.users(id),reason text not null,status text not null default 'requested' check(status in('requested','under_review','approved','rejected','received')),created_at timestamptz not null default now());
create table public.refunds(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),amount bigint not null check(amount>0),provider_id text unique,status text not null default 'requested',reason text not null,created_at timestamptz not null default now());
create table public.support_inquiries(id uuid primary key default gen_random_uuid(),name text not null,email text not null,subject text not null,message text not null,status text not null default 'new',created_at timestamptz not null default now());
create table public.newsletter_subscriptions(id uuid primary key default gen_random_uuid(),email text unique not null,consent boolean not null check(consent),created_at timestamptz not null default now());
create table public.notification_jobs(id uuid primary key default gen_random_uuid(),order_id uuid references public.orders(id),kind text not null,email text not null,payload jsonb not null default '{}',dedupe_key text unique not null,status text not null default 'pending',attempts integer not null default 0,next_attempt_at timestamptz not null default now(),last_error text,created_at timestamptz not null default now());
create table public.audit_events(id uuid primary key default gen_random_uuid(),actor uuid references auth.users(id),action text not null,record_id text,created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,window_start timestamptz not null default now(),count integer not null default 1);
create index orders_user_created on public.orders(user_id,created_at desc);
create index orders_pending on public.orders(expires_at) where payment_status='pending';
create index products_category on public.products(category,published);
create index products_search on public.products using gin(to_tsvector('english',name||' '||description));
create index variants_product on public.variants(product_id);
create index items_order on public.order_items(order_id);
create index reservations_order on public.stock_reservations(order_id,status);
create index notifications_pending on public.notification_jobs(status,next_attempt_at);
-- Defense in depth: deny by default on all application tables.
do $$declare t text;begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);end loop;end$$;
grant usage on schema public to anon,authenticated,service_role;
grant all on all tables in schema public to service_role;
grant select on public.products,public.categories,public.store_settings,public.shipping_zones to anon,authenticated;
create policy published_products on public.products for select using(published or public.is_owner());
create policy categories_read on public.categories for select using(true);
create policy settings_read on public.store_settings for select using(true);
create policy shipping_read on public.shipping_zones for select using(enabled or public.is_owner());
grant select(id,product_id,display_name,rating,body,approved,created_at) on public.reviews to anon;
create policy reviews_read on public.reviews for select using(approved or user_id=auth.uid() or public.is_owner());
grant select on public.owner_roles to authenticated;
create policy own_role on public.owner_roles for select to authenticated using(user_id=auth.uid());
grant select,update(name) on public.profiles to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid() or public.is_owner());
create policy edit_profile on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
grant select,insert,update,delete on public.addresses,public.saved_items to authenticated;
create policy own_addresses on public.addresses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy own_saved on public.saved_items for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select on public.orders,public.order_items,public.return_requests,public.refunds to authenticated;
create policy own_orders on public.orders for select to authenticated using(user_id=auth.uid() or public.is_owner());
create policy own_items on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_owner())));
create policy own_returns on public.return_requests for select to authenticated using(user_id=auth.uid() or public.is_owner());
create policy own_refunds on public.refunds for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_owner())));
grant select,update(approved) on public.reviews to authenticated;
create policy owner_moderate on public.reviews for update to authenticated using(public.is_owner()) with check(public.is_owner());
grant update(status) on public.return_requests to authenticated;
create policy owner_returns on public.return_requests for update to authenticated using(public.is_owner()) with check(public.is_owner());
grant select on public.audit_events,public.support_inquiries,public.notification_jobs,public.inventory_movements,public.stock_reservations,public.variants,public.payment_attempts,public.payment_events to authenticated;
do $$declare t text;begin foreach t in array array['audit_events','support_inquiries','notification_jobs','inventory_movements','stock_reservations','variants','payment_attempts','payment_events'] loop execute format('create policy owner_read on public.%I for select to authenticated using(public.is_owner())',t);end loop;end$$;
grant select,insert,update,delete on public.coupons,public.shipping_zones to authenticated;
create policy owner_coupons on public.coupons for all to authenticated using(public.is_owner()) with check(public.is_owner());
create policy owner_shipping on public.shipping_zones for all to authenticated using(public.is_owner()) with check(public.is_owner());
grant update(value) on public.store_settings to authenticated;
create policy owner_settings on public.store_settings for update to authenticated using(public.is_owner()) with check(public.is_owner());
-- No client writes to orders, order items, payments, stock, role assignments or audit events.
create function public.audit_change() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.audit_events(actor,action,record_id) values(auth.uid(),tg_table_name||'.'||lower(tg_op),coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id'));return coalesce(new,old);end$$;
do $$declare t text;begin foreach t in array array['products','store_settings','coupons','shipping_zones','reviews','return_requests'] loop execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_change()',t);end loop;end$$;
create function public.sync_available() returns trigger language plpgsql security definer set search_path='' as $$begin update public.products set stock=coalesce((select max(stock-reserved) from public.variants where product_id=new.product_id and active),0),updated_at=now() where id=new.product_id;return new;end$$;
create trigger sync_available after insert or update on public.variants for each row execute function public.sync_available();
create function public.take_rate_limit(p_key text,p_limit integer) returns boolean language plpgsql security definer set search_path='' as $$declare n integer;begin insert into public.rate_limits(key) values(p_key) on conflict(key) do update set count=case when public.rate_limits.window_start<now()-interval '1 minute' then 1 else public.rate_limits.count+1 end,window_start=case when public.rate_limits.window_start<now()-interval '1 minute' then now() else public.rate_limits.window_start end returning count into n;return n<=least(p_limit,100);end$$;
create function public.save_product(p_product jsonb) returns void language plpgsql security definer set search_path='' as $$declare pid uuid;opt text;oldstock integer;v public.variants;begin
 perform pg_advisory_xact_lock(84276001);

 if not public.is_owner() then raise exception 'Owner verification required';end if;
 pid=(p_product->>'id')::uuid;
 if (p_product->>'stock')::integer<0 or (p_product->>'price')::bigint<=0 or jsonb_array_length(p_product->'colors')=0 then raise exception 'Invalid product values';end if;
 insert into public.products(id,slug,name,category,price,image,description,colors,stock,published,featured,badge,specs) values(pid,p_product->>'slug',p_product->>'name',p_product->>'category',(p_product->>'price')::bigint,p_product->>'image',p_product->>'description',p_product->'colors',(p_product->>'stock')::integer,(p_product->>'published')::boolean,coalesce((p_product->>'featured')::boolean,false),p_product->>'badge',coalesce(p_product->'specs','{}')) on conflict(id) do update set slug=excluded.slug,name=excluded.name,category=excluded.category,price=excluded.price,image=excluded.image,description=excluded.description,colors=excluded.colors,published=excluded.published,featured=excluded.featured,badge=excluded.badge,specs=excluded.specs,updated_at=now();
 for opt in select jsonb_array_elements_text(p_product->'colors') order by 1 loop
 select * into v from public.variants where product_id=pid and option=opt for update;
 if found then
 if (p_product->>'stock')::integer<v.reserved then raise exception 'Stock cannot fall below reserved quantity';end if;
 update public.variants set stock=(p_product->>'stock')::integer,active=true where id=v.id;
 insert into public.inventory_movements(variant_id,quantity,reason,actor) values(v.id,(p_product->>'stock')::integer-v.stock,'Owner stock adjustment',auth.uid());
 else insert into public.variants(product_id,option,stock) values(pid,opt,(p_product->>'stock')::integer);end if;
 end loop;
 update public.variants set active=false where product_id=pid and not (p_product->'colors' ? option);
end$$;
create function public.submit_review(p_product uuid,p_rating integer,p_body text,p_display_name text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not exists(select 1 from public.order_items i join public.orders o on o.id=i.order_id where i.product_id=p_product and o.user_id=auth.uid() and o.payment_status='paid' and o.fulfillment_status='delivered') then raise exception 'Reviews are available after a verified purchase is delivered';end if;
 if length(p_body)<10 or length(p_body)>2000 or length(p_display_name)>60 then raise exception 'Invalid review';end if;
 insert into public.reviews(product_id,user_id,rating,body,display_name) values(p_product,auth.uid(),p_rating,p_body,p_display_name) on conflict(product_id,user_id) do update set rating=excluded.rating,body=excluded.body,display_name=excluded.display_name,approved=false;
end$$;
create function public.request_return(p_order uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.orders where id=p_order and user_id=auth.uid() and payment_status='paid' and fulfillment_status='delivered') then raise exception 'A delivered, paid order is required';end if;
 if length(p_reason)<10 or length(p_reason)>2000 then raise exception 'Please describe the issue';end if;
 if exists(select 1 from public.return_requests where order_id=p_order and status not in('rejected')) then raise exception 'This order already has an active return request';end if;
 insert into public.return_requests(order_id,user_id,reason) values(p_order,auth.uid(),p_reason);
end$$;
create function public.update_fulfillment(p_order uuid,p_status text,p_tracking text) returns void language plpgsql security definer set search_path='' as $$declare o public.orders;begin
 if not public.is_owner() then raise exception 'Owner verification required';end if;
 select * into strict o from public.orders where id=p_order for update;
 if p_status=o.fulfillment_status then return;end if;
 if o.payment_status<>'paid' then raise exception 'Only verified paid orders can move through fulfillment';end if;
 if not ((o.fulfillment_status='unfulfilled' and p_status='processing') or (o.fulfillment_status='processing' and p_status='shipped') or (o.fulfillment_status='shipped' and p_status='delivered')) then raise exception 'Invalid fulfillment transition. Cancellation requires refund review.';end if;
 update public.orders set fulfillment_status=p_status,tracking=nullif(p_tracking,'') where id=p_order;
 insert into public.audit_events(actor,action,record_id) values(auth.uid(),'order.'||p_status,p_order::text);
 insert into public.notification_jobs(order_id,kind,email,payload,dedupe_key) values(o.id,'shipment',o.email,jsonb_build_object('reference',o.reference,'status',p_status,'tracking',p_tracking),o.id::text||':'||p_status) on conflict(dedupe_key) do nothing;
end$$;
-- Function execution is explicit, including security-definer entrypoints.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_owner() to anon,authenticated;
grant execute on function public.save_product(jsonb),public.submit_review(uuid,integer,text,text),public.request_return(uuid,text),public.update_fulfillment(uuid,text,text) to authenticated;
grant execute on all functions in schema public to service_role;
-- Public product media; private customer files. No anonymous upload policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp']),('customer-files','customer-files',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy owner_product_files on storage.objects for all to authenticated using(bucket_id='product-images' and public.is_owner()) with check(bucket_id='product-images' and public.is_owner());
create policy own_customer_files on storage.objects for all to authenticated using(bucket_id='customer-files' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='customer-files' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
