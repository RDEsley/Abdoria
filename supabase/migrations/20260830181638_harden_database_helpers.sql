-- Funções auxiliares não fazem parte da API pública do aplicativo.
-- Restringe execução da função privilegiada e fixa o search_path do trigger.
revoke execute on function public.rls_auto_enable()
from public, anon, authenticated, service_role;

grant execute on function public.rls_auto_enable() to postgres;

alter function public.update_updated_at()
set search_path = pg_catalog;

-- A mesma chave já é coberta por workout_history_user_date, criado no schema
-- canônico. Manter os dois índices aumenta escrita e armazenamento sem ganho.
drop index if exists public.idx_workout_history_usuario_concluido;
