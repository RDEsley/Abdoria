-- quest_claims was created with FK to auth.users, but Evolyn accounts live in
-- public.profiles (Express JWT). Inserts therefore failed with 23503 and the
-- Tríplice claim never completed. Retarget the FK and make reward recoverable.

alter table public.quest_claims
  drop constraint if exists quest_claims_user_id_fkey;

alter table public.quest_claims
  add constraint quest_claims_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.quest_claims
  add column if not exists rewarded_at timestamptz;

-- Rows that already exist were inserted only if the old FK succeeded; treat them
-- as already paid so a retry does not double-award.
update public.quest_claims
set rewarded_at = coalesce(rewarded_at, claimed_at)
where rewarded_at is null;

create or replace function public.claim_quest_slot(
  p_user_id uuid,
  p_quest_id text,
  p_period_key text,
  p_xp integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.quest_claims%rowtype;
begin
  insert into public.quest_claims (user_id, quest_id, period_key, xp_awarded)
  values (p_user_id, p_quest_id, p_period_key, p_xp)
  on conflict (user_id, quest_id, period_key) do nothing;

  select * into rec
  from public.quest_claims
  where user_id = p_user_id
    and quest_id = p_quest_id
    and period_key = p_period_key
  for update;

  if not found then
    raise exception 'claim slot missing';
  end if;

  return jsonb_build_object(
    'already_rewarded', rec.rewarded_at is not null,
    'xp_awarded', rec.xp_awarded
  );
end;
$$;

create or replace function public.mark_quest_rewarded(
  p_user_id uuid,
  p_quest_id text,
  p_period_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quest_claims
  set rewarded_at = coalesce(rewarded_at, now())
  where user_id = p_user_id
    and quest_id = p_quest_id
    and period_key = p_period_key
    and rewarded_at is null;
end;
$$;

revoke all on function public.claim_quest_slot(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.mark_quest_rewarded(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_quest_slot(uuid, text, text, integer) to service_role;
grant execute on function public.mark_quest_rewarded(uuid, text, text) to service_role;
