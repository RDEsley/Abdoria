-- Pausa da Exploração (vila) precisa sobreviver entre requests.
--
-- `paused_at` já era escrito em memória por pauseAfk/activateAfk, mas não
-- existia coluna nem leitura: toda request nascia despausada e creditava o
-- tempo passado na vila como se fosse exploração. Sem isso, a vila só
-- "pausava" dentro da própria request que pediu a pausa.
alter table user_afk_state
  add column if not exists paused_at timestamptz;
