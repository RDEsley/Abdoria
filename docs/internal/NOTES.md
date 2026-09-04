# Evolyn — Notas técnicas ativas

Este arquivo contém apenas decisões e riscos que continuam relevantes para manutenção.

## Identidade e nomenclatura

- A identidade pública atual é **Evolyn**.
- A assinatura oficial é **“Plantando a sua evolução.”**
- A área pública de treino usa **Treino** e a rota principal é `/treino`.
- Evitar na interface/documentação atual nomenclaturas antigas como Abdoria, Dorias, Coins, Gems, Construtor, RPG e AFK.
- Identificadores persistidos legados (`abdoria_*`, campos antigos, eventos ou chaves de storage) podem permanecer quando necessários para compatibilidade. Não renomear sem avaliar migração e impacto em usuários existentes.
- Campos de API como `abdoria`, `coins` e `gems` permanecem em alguns contratos administrativos e de loja; a interface deve apresentá-los como **Folhas** e **Folhas douradas**.

## Branding

- Fonte de verdade dos originais: `docs/internal/logos-icons/`.
- Runtime Web: `client/public/brand/` e manifest/metadata correspondentes.
- Alterações de marca devem considerar Web, PWA, Android e iOS.
- `docs/internal/` nunca deve ser uma dependência de runtime.

## Legado RPG/AFK

- `docs/internal/Exploracao-rpg-afk/` é apenas histórico.
- Não incluir esse conteúdo em runtime, lint, testes ou bundle atual.
- Reaproveitamento exige implementação compatível com a arquitetura atual.

## Banco de dados

- Migrations aplicadas são imutáveis e ficam em `supabase/migrations/applied/`. Novas mudanças de schema entram em `supabase/migrations/` (raiz) e, depois de aplicadas no live, movem-se para `applied/`.
- Evitar snapshots completos de perfil quando apenas campos específicos mudaram.
- Preferir escritas parciais quando aplicável para reduzir risco de sobrescrever alterações concorrentes.
- Ter cuidado especial com alterações concorrentes em `preferencias`.
- Dados de rotina e atividades **não** entram em `preferencias`. A fonte é `activities`, `routines`, `activity_logs`.
- Toda ação diária válida (treino, atividade, rotina; hidratação/MyPlant no futuro) passa por `recordValidDailyAction` em `server/src/services/active-day.ts`. O Streak lê `active_days`, não o histórico de treino.
- Linhas de atividade em `workout_history` identificam-se pela coluna `atividade IS NOT NULL`. O prefixo `Atividade:` no nome não é mais lido.
- Fuso oficial do Dia Ativo, XP diário e ranking: `America/Sao_Paulo`. Fuso do dispositivo só para entrega de push.

## Plataforma

- O produto é mobile-first, mas desktop deve continuar responsivo e funcional.
- Mudanças nativas devem considerar Capacitor, Android e iOS quando aplicável.
- A splash nativa (`launchAutoHide: false`) permanece visível até a hidratação inicial em `AppBootGate`, que também cobre PWA/web com o mesmo fundo `#f4faf7`.
- Ícones instaláveis vêm de `docs/internal/logos-icons/app-icon.png`, propagados por `scripts/update-brand-assets.ps1` para `client/public/brand/app-icon-*`.
- Imagem de notificação do SO: `docs/internal/logos-icons/broto-assistente.png` → `client/public/media/notifications/icons/evolyn-{96,192}.png` (mesmo script de brand).

## Notificações

- **Inbox (sino)**: tabela `notifications` + API `/api/notifications` — eventos do app.
- **Avisos locais** (`client/src/lib/local-notifications.ts`): calculados no client a partir do dashboard; não são push.
- **Lembretes personalizados** (`preferencias.lembretes_personalizados`):
  - **Android/iOS**: Capacitor Local Notifications (`notification-scheduler.ts`).
  - **Web/PWA**: Web Push + Service Worker (`client/public/sw.js`) com dispatcher server (`/api/cron/reminder-push`) acionado por **Supabase `pg_cron` + `pg_net`** (segredos no Vault: `evolyn_cron_secret`, `evolyn_reminder_cron_url`).
- `notificacoes_opt_out` desliga entrega OS-level; lembretes continuam salvos.
- Som de notificação nativo voltou: campo `sound` em lembretes (default `app_default`). Canais Android versionados por som (`evolyn_reminder_*_v1`); WAVs gerados do catálogo SFX. Cor/ícone do lembrete são só organização in-app; large icon do SO é o Broto Assistente.
- `quest_claims.user_id` aponta para `profiles(id)` (não `auth.users`). Claim usa RPC `claim_quest_slot` + `rewarded_at` para ser recuperável.
- Web Push exige `VAPID_*`, `VITE_VAPID_PUBLIC_KEY`, `CRON_SECRET` (Vercel) e migration `20260902183000_push_hardening_and_supabase_cron.sql`.
- Frozen Streak consumido no backend gera `streak_freeze_notice` / `streak_frozen_event` em `/stats` e celebração na Home — **não** cria mais item `streak_frozen` na Caixa de Entrada. A celebração usa `preserved_streak` (sequência protegida). Frozen nunca incrementa sozinho; ação válida posterior é que faz 10 → 11.

## Home / Guia do dia

- `GET /api/day.next_up` é o Guia determinístico (`shared/activities/day-guide.ts`): uma ação principal + no máximo uma secundária. Não é mais a ordem fixa treino → atividade → rotina.
- Conclusão de item de rotina isola por `routine_id` no `activity_log`. A mesma Activity em duas rotinas não se completa cruzada. Activity avulsa não marca item de rotina.
- `routine_items.scheduled_time` / `reminder_enabled` são opcionais (migration `20260903180000_routine_items_schedule.sql`). Agenda da rotina continua em `routines.schedule`.
- WeekStrip da Home = últimos 7 dias. Retrospectiva `week_retro` = semana civil Seg–Dom em `America/Sao_Paulo`. Tempo de treino da Home (`segundos_semana`) também é semana civil.
- Momentum `current_period` usa `getHourSaoPaulo()`, nunca `Date#getHours()` do processo Vercel.

## Segurança

- Nenhum diretório versionado é realmente privado.
- Credenciais e dados reais devem permanecer fora do Git.
- `.env.example` deve conter apenas placeholders.

## Autenticação

- Sessão autenticada persiste em `localStorage` (`abdoria_token`) até **Sair da conta**. Não existe mais checkbox "Lembrar de mim".
- O último email fica em `abdoria_saved_email` neste aparelho e sobrevive ao logout.
- Cadastro retorna `AuthResponse`; o cliente autentica na hora e segue para o onboarding.
- Entrada sem sessão: `/welcome`. Rotas protegidas (exceto `/`) redirecionam para `/login` com `state.from`.
- Conta visitante foi removida da API (`POST /auth/guest`) e da UI. `is_guest` permanece no banco para linhas antigas e filtros de ranking.
- Animação da Welcome é local (`evolyn:welcome-animation-seen`); não vai para o perfil.
