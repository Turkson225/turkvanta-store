begin;
create function public.expire_reservations() returns integer language plpgsql security definer set search_path='' as $$declare o record;r record;n integer=0;begin
 perform pg_advisory_xact_lock(84276001);

 for o in select * from public.orders where payment_status='pending' and expires_at<now() for update skip locked loop
 for r in select * from public.stock_reservations where order_id=o.id and status='held' order by variant_id loop
 update public.variants set reserved=reserved-r.quantity where id=r.variant_id;
 end loop;
 update public.stock_reservations set status='released' where order_id=o.id and status='held';
 update public.orders set payment_status='expired' where id=o.id;
 if o.coupon_id is not null then update public.coupons set reserved=greatest(0,reserved-1) where id=o.coupon_id;end if;
 n=n+1;
 end loop;
 delete from public.rate_limits where window_start<now()-interval '1 day';return n;
end$$;
create function public.create_checkout(p_user uuid,p_email text,p_items jsonb,p_address jsonb,p_zone uuid,p_pickup boolean,p_coupon text,p_key uuid,p_guest_hash text) returns jsonb language plpgsql security definer set search_path='' as $$declare o public.orders;v record;line record;sub bigint=0;ship bigint=0;disc bigint=0;coupon public.coupons;oid uuid=gen_random_uuid();fingerprint text;items jsonb='[]';begin
 perform pg_advisory_xact_lock(84276001);

 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'Your bag is empty or too large';end if;
 if length(p_email)>254 or p_email not like '%@%' then raise exception 'A valid email is required';end if;
 if p_user is null and (p_guest_hash is null or length(p_guest_hash)<>64) then raise exception 'Guest access token required';end if;
 fingerprint=encode(extensions.digest(jsonb_build_object('user',p_user,'email',p_email,'items',p_items,'address',p_address,'zone',p_zone,'pickup',p_pickup,'coupon',p_coupon)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 select * into o from public.orders where idempotency_key=p_key;
 if found then
 if o.request_hash<>fingerprint or o.user_id is distinct from p_user or (p_user is null and o.guest_hash<>p_guest_hash) then raise exception 'This checkout changed. Please start a new checkout';end if;
 if o.payment_status<>'pending' then raise exception 'This checkout is no longer pending';end if;
 return to_jsonb(o);
 end if;
 perform public.expire_reservations();
 if p_pickup then
 if not exists(select 1 from public.store_settings where id='main' and value->>'pickup'='true') then raise exception 'Pickup is not currently available';end if;
 else select fee into ship from public.shipping_zones where id=p_zone and enabled;if not found then raise exception 'Choose a supported delivery zone';end if;end if;
 -- Aggregate duplicate lines and lock SKUs in a stable order.
 for line in select (x->>'productId')::uuid pid,x->>'variant' opt,sum((x->>'quantity')::integer)::integer qty from jsonb_array_elements(p_items) x group by 1,2 order by 1,2 loop
 if line.qty<1 or line.qty>999 then raise exception 'Invalid quantity';end if;
 select sku.id,sku.stock,sku.reserved,p.name,p.price,p.published into v from public.variants sku join public.products p on p.id=sku.product_id where sku.product_id=line.pid and sku.option=line.opt and sku.active for update of sku;
 if not found or not v.published then raise exception 'An item is no longer available';end if;
 if v.stock-v.reserved<line.qty then raise exception 'There is not enough stock for %',v.name;end if;
 sub=sub+v.price*line.qty;
 items=items||jsonb_build_array(jsonb_build_object('variant_id',v.id,'product_id',line.pid,'name',v.name,'option',line.opt,'quantity',line.qty,'unit_price',v.price));
 end loop;
 if nullif(trim(p_coupon),'') is not null then
 select * into coupon from public.coupons where code=upper(trim(p_coupon)) for update;
 if not found or coupon.expires_at<=now() or coupon.uses+coupon.reserved>=coupon.max_uses or sub<coupon.minimum then raise exception 'This coupon is not available for the order';end if;
 disc=(sub*coupon.percent)/100;
 update public.coupons set reserved=reserved+1 where id=coupon.id;
 end if;
 insert into public.orders(id,user_id,email,address,subtotal,discount,shipping,tax,total,coupon_id,idempotency_key,request_hash,guest_hash) values(oid,p_user,p_email,p_address,sub,disc,ship,0,sub-disc+ship,coupon.id,p_key,fingerprint,p_guest_hash) returning * into o;
 for line in select * from jsonb_to_recordset(items) as x(variant_id uuid,product_id uuid,name text,option text,quantity integer,unit_price bigint) loop
 insert into public.order_items(order_id,variant_id,product_id,name,option,quantity,unit_price) values(oid,line.variant_id,line.product_id,line.name,line.option,line.quantity,line.unit_price);
 update public.variants set reserved=reserved+line.quantity where id=line.variant_id;
 insert into public.stock_reservations(order_id,variant_id,quantity) values(oid,line.variant_id,line.quantity);
 end loop;
 return to_jsonb(o);
end$$;
create function public.complete_payment(p_reference text,p_amount bigint,p_currency text,p_provider_id text,p_event text) returns jsonb language plpgsql security definer set search_path='' as $$declare o public.orders;r record;held boolean;available boolean=true;begin
 perform pg_advisory_xact_lock(84276001);

 select * into strict o from public.orders where reference=p_reference for update;
 if o.total is distinct from p_amount or o.currency is distinct from p_currency then raise exception 'Payment amount or currency mismatch';end if;
 if o.payment_status in('paid','refunded') then return jsonb_build_object('status',o.payment_status,'reference',o.reference);end if;
 if o.payment_status='reconciliation' then return jsonb_build_object('status','reconciliation','reference',o.reference);end if;
 if exists(select 1 from public.payment_events where id='paystack:'||p_provider_id and order_id is distinct from o.id) then raise exception 'Transaction is already assigned to another order';end if;
 insert into public.payment_events(id,order_id,event) values('paystack:'||p_provider_id,o.id,p_event) on conflict(id) do nothing;
 held=o.payment_status='pending';
 for r in select sr.*,v.stock,v.reserved from public.stock_reservations sr join public.variants v on v.id=sr.variant_id where sr.order_id=o.id order by sr.variant_id for update of v loop
 if not held and r.stock-r.reserved<r.quantity then available=false;end if;
 end loop;
 if not available then
 update public.orders set payment_status='reconciliation' where id=o.id;
 insert into public.notification_jobs(order_id,kind,email,payload,dedupe_key) values(o.id,'reconciliation',o.email,jsonb_build_object('reference',o.reference),o.id::text||':reconciliation') on conflict(dedupe_key) do nothing;
 return jsonb_build_object('status','reconciliation','reference',o.reference);
 end if;
 for r in select * from public.stock_reservations where order_id=o.id order by variant_id loop
 update public.variants set stock=stock-r.quantity,reserved=reserved-case when held then r.quantity else 0 end where id=r.variant_id;
 insert into public.inventory_movements(variant_id,order_id,quantity,reason) values(r.variant_id,o.id,-r.quantity,'Verified payment');
 end loop;
 update public.stock_reservations set status='consumed' where order_id=o.id;
 update public.orders set payment_status='paid' where id=o.id;
 if o.coupon_id is not null then update public.coupons set reserved=greatest(0,reserved-case when held then 1 else 0 end),uses=uses+1 where id=o.coupon_id;end if;
 update public.payment_attempts set status='paid',provider_id=p_provider_id where order_id=o.id;
 insert into public.notification_jobs(order_id,kind,email,payload,dedupe_key) values(o.id,'paid',o.email,jsonb_build_object('reference',o.reference,'amount',o.total,'currency',o.currency),o.id::text||':paid') on conflict(dedupe_key) do nothing;
 return jsonb_build_object('status','paid','reference',o.reference);
end$$;
create function public.quote_coupon(p_code text,p_items jsonb) returns bigint language plpgsql security definer set search_path='' as $$declare sub bigint=0;c public.coupons;r record;begin
 if jsonb_array_length(p_items)>100 then raise exception 'Too many items';end if;
 for r in select * from jsonb_to_recordset(p_items) as x("productId" uuid,variant text,quantity integer) loop
 if r.quantity<1 or r.quantity>999 then raise exception 'Invalid quantity';end if;
 sub=sub+coalesce((select price from public.products where id=r."productId" and published),0)*r.quantity;
 end loop;
 select * into c from public.coupons where code=upper(trim(p_code));
 if not found or c.expires_at<=now() or c.uses+c.reserved>=c.max_uses or sub<c.minimum then raise exception 'This code is not available for your bag';end if;
 return (sub*c.percent)/100;
end$$;
create function public.claim_notifications() returns setof public.notification_jobs language sql security definer set search_path='' as $$update public.notification_jobs set status='sending',attempts=attempts+1,next_attempt_at=now()+interval '5 minutes' where id in(select id from public.notification_jobs where (status='pending' or (status='sending' and next_attempt_at<now())) and next_attempt_at<=now() and attempts<10 order by created_at limit 10 for update skip locked) returning *$$;
revoke execute on function public.expire_reservations(),public.create_checkout(uuid,text,jsonb,jsonb,uuid,boolean,text,uuid,text),public.complete_payment(text,bigint,text,text,text),public.quote_coupon(text,jsonb),public.claim_notifications() from public,anon,authenticated;
grant execute on function public.expire_reservations(),public.create_checkout(uuid,text,jsonb,jsonb,uuid,boolean,text,uuid,text),public.complete_payment(text,bigint,text,text,text),public.quote_coupon(text,jsonb),public.claim_notifications() to service_role;
commit;
