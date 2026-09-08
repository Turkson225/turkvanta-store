begin;
-- One full-refund intent per order. Ambiguous provider responses require reconciliation, never blind retry.
create unique index one_full_refund_per_order on public.refunds(order_id);
create function public.prepare_refund(p_order uuid,p_actor uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$declare o public.orders;r public.refunds;begin
 select * into strict o from public.orders where id=p_order for update;
 if not exists(select 1 from public.owner_roles where user_id=p_actor) then raise exception 'Owner required';end if;
 select * into r from public.refunds where order_id=p_order;
 if found then return to_jsonb(r)||jsonb_build_object('submit',false,'reference',o.reference);end if;
 if o.payment_status not in('paid','reconciliation') then raise exception 'Only a verified payment can be refunded';end if;
 if length(p_reason)<5 then raise exception 'A refund reason is required';end if;
 insert into public.refunds(order_id,amount,status,reason) values(o.id,o.total,'submitting',p_reason) returning * into r;
 insert into public.audit_events(actor,action,record_id) values(p_actor,'refund.requested',r.id::text);
 return to_jsonb(r)||jsonb_build_object('submit',true,'reference',o.reference);
end$$;
create function public.complete_refund(p_refund uuid,p_amount bigint) returns void language plpgsql security definer set search_path='' as $$declare r public.refunds;o public.orders;begin
 select * into strict r from public.refunds where id=p_refund for update;
 if r.amount is distinct from p_amount then raise exception 'Refund amount mismatch';end if;
 if r.status='processed' then return;end if;
 select * into strict o from public.orders where id=r.order_id for update;
 update public.refunds set status='processed' where id=r.id;
 update public.orders set payment_status='refunded',fulfillment_status=case when fulfillment_status in('unfulfilled','processing') then 'cancelled' else fulfillment_status end where id=o.id;
 insert into public.notification_jobs(order_id,kind,email,payload,dedupe_key) values(o.id,'refund',o.email,jsonb_build_object('reference',o.reference,'amount',r.amount),o.id::text||':refund') on conflict(dedupe_key) do nothing;
 -- No automatic stock return: inspect returned goods and adjust stock explicitly.
end$$;
revoke execute on function public.prepare_refund(uuid,uuid,text),public.complete_refund(uuid,bigint) from public,anon,authenticated;
grant execute on function public.prepare_refund(uuid,uuid,text),public.complete_refund(uuid,bigint) to service_role;
create table public.refund_event_inbox(provider_id text primary key,amount bigint not null,reference text,processed boolean not null default false,created_at timestamptz not null default now());
alter table public.refund_event_inbox enable row level security;
revoke all on public.refund_event_inbox from anon,authenticated;
grant all on public.refund_event_inbox to service_role;
grant select on public.refund_event_inbox to authenticated;
create policy owner_inbox on public.refund_event_inbox for select to authenticated using(public.is_owner());
alter table public.orders add column payment_checked_at timestamptz not null default '2000-01-01T00:00:00Z';
commit;
