-- Drop leftover quest_claims client RLS policies (initplan warnings).
-- Access remains service_role-only via Express JWT.

drop policy if exists "Users can read own claims" on public.quest_claims;
drop policy if exists "Server can insert claims" on public.quest_claims;
drop policy if exists "Users can view own quest claims" on public.quest_claims;
drop policy if exists "Users can insert own quest claims" on public.quest_claims;
