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

- Migrations aplicadas são imutáveis; mudanças de schema devem criar novas migrations.
- Evitar snapshots completos de perfil quando apenas campos específicos mudaram.
- Preferir escritas parciais quando aplicável para reduzir risco de sobrescrever alterações concorrentes.
- Ter cuidado especial com alterações concorrentes em `preferencias`.

## Plataforma

- O produto é mobile-first, mas desktop deve continuar responsivo e funcional.
- Mudanças nativas devem considerar Capacitor, Android e iOS quando aplicável.
- A splash nativa (`launchAutoHide: false`) permanece visível até a hidratação inicial em `AppBootGate`, que também cobre PWA/web com o mesmo fundo `#f4faf7`.
- Ícones instaláveis vêm de `docs/internal/logos-icons/app-icon.png`, propagados por `scripts/update-brand-assets.ps1` para `client/public/brand/app-icon-*`.

## Notificações

- **Inbox (sino)**: tabela `notifications` + API `/api/notifications` — eventos do app.
- **Avisos locais** (`client/src/lib/local-notifications.ts`): calculados no client a partir do dashboard; não são push.
- **Lembretes personalizados** (`preferencias.lembretes_personalizados`):
  - **Android/iOS**: Capacitor Local Notifications (`notification-scheduler.ts`).
  - **Web/PWA**: Web Push + Service Worker (`client/public/sw.js`) com cron server (`/api/cron/reminder-push`).
- `notificacoes_opt_out` desliga entrega OS-level; lembretes continuam salvos.
- Web Push exige `VAPID_*`, `VITE_VAPID_PUBLIC_KEY`, `CRON_SECRET` e migration `20260902120000_push_subscriptions_and_health_ping.sql`.

## Segurança

- Nenhum diretório versionado é realmente privado.
- Credenciais e dados reais devem permanecer fora do Git.
- `.env.example` deve conter apenas placeholders.
