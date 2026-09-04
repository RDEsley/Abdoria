# Evolyn — Development Log

Memória curta de desenvolvimento para continuidade entre agentes e sessões.

O Git continua sendo a fonte de verdade do histórico detalhado.

---

## 2026-09-04

### Atividades 3.0 — interação mobile

- Catálogo de criação: oculta Respiração/Yoga/Cuidados (`offerInCreate: false`); legado continua via `findActivityTemplate`.
- Matching: `suggestActivityTemplates` (máx. 3) + aliases/frases; Modal `autoFocus={false}` em criar/detalhes.
- Swipe: direita concluir / esquerda arquivar + Desfazer (`POST /activities/:id/restore`); hint one-shot; optimistic complete.
- Notas rápidas recolhíveis (badge = pendentes); abas: estado local + skip sync URL (fim do flicker).

### Core hardening (quests, claim, progression)

- Missões: `quest_assignments` persiste 3/2/1 por período SP; claim só do conjunto atribuído; `claim_quest_reward` atômico (XP+mark).
- Progresso: `scheduledActivityCompletedToday` / `scheduledRoutineCompletedToday`; metas mensais alcançáveis.
- Activities: complete devolve feedback imediato + Level Up/conquistas/streak via `emitProgressionFeedback`; refetch em background.
- Celebrações full-screen: fila única (streak → level → cosmetic). Lottie fire-streak/rotina-check com prewarm; `treino-check.json` removido (asset morto).
- Ranking: filtro único (guest/NPC/admin oculto); `/me` com `rank: null` se admin oculto.
- Notif skip: cooldown 14d; denied não abre settings sozinho.
- Release artifacts: `version.json` e `app-release.ts` gerados no build (gitignore); stub + `ensure-app-release.mjs`.

### Celebrações, Streak cinema, PWA Welcome e Perfil

- Rotina: `RoutineCompleteScreen` com `rotina-check.json` (lazy); sem `WorkoutVictoryScreen`; celebração só na transição incompleta→completa da sessão.
- Streak Home: overlay cinemático com `fire-streak.json` (~2s, sem dismiss); Frozen permanece separado.
- Card Streak Home: dormido vs aceso via `diaAtivo`; card tempo → “Essa semana”.
- Perfil: remove `AchievementsPreview`; streak sem sufixo `d`.
- Welcome: CTA instalar via `PwaInstallContext` + cooldown local.
- Level up: overlay mais curto (~3s), número protagonista, glow âmbar.

### Limpeza comunidade + progresso

- Ranking só global; seed NPC removido; limpeza one-off do banco (preservada 1 conta).
- Rotinas com feedback otimista; /recordes; busca/filtros em Hoje; streak0 admin; DaySummary por horário SP.
- Settings/About/Gift polish; boot phrases; gráfico Evolução; missões board swipe.

### Rotinas 2.0, Missões, notificações e Treino

- Criar rotina: wizard 3 etapas (montar → agenda opcional → revisão + frase de sucesso). Editar: abas Rotina/Agenda sem celebração.
- Rotinas arquivadas: listagem sob demanda + restore (`GET /routines?archived=1`, `POST /routines/:id/restore`). Sem hard delete.
- `/atividades`: aba volta para `Hoje` ao sair da página (`usePageTab`); `?tab=insights` alias de Missões.
- Missões personalizadas determinísticas (`userId + periodKey`, SP): 3 diárias / 2 semanais / 1 mensal (`MYYYY-MM`). Pool em `shared/quests/catalog.ts`. XP fora do teto preservado. Claim chama `emitXpEarned`.
- Notificações: `NotificationPermissionContext` + gate em lembretes; etapa no onboarding; Settings revalida no foreground.
- Treino: “Intensidade do plano” (leve/moderado/evolyn/custom) via `ab_training_profile_v2`; UI global de esquemas de reps da Personalização avançada ocultada. Plano de Core: scroll do passo final + lesgo em loop.

---

## 2026-09-03

### Atualização PWA (release vs build)

- `AppUpdateProvider` + `version.json` + build embutido. UI de update só quando `version` remota > local. Build id só diagnóstico.
- Detalhes em `NOTES.md` → “Atualização do app (PWA)”.

### Experiência de entrada (Welcome / Login / Cadastro)

- Welcome full-screen com símbolo Evolyn animado; login e cadastro em sheet sobre a mesma cena (`/welcome`, `/login`, `/register`).
- Sessão sempre persistida; cadastro autentica com o `AuthResponse` e vai ao onboarding. Guest removido.
- Boot overlay cobre a hidratação para não piscar Welcome quando já existe token.

### Assistente do Dia, Rotinas e UX

- Guia "A seguir" (`buildDayGuide`) substitui o `next_up` de ordem fixa. Quick Actions da Home foram removidas.
- Frozen: celebração mostra `preserved_streak`; ação válida no mesmo fluxo pode seguir com 10 → 11.
- Rotinas: agenda opcional, horário/lembrete por item, isolamento de execução por `routine_id`, vitória só na conclusão real.
- Lembretes: prévia no topo é o editor; sem autofocus. Derivados de rotina/item reutilizam Web Push/cron/native com IDs `routine:` / `routine-item:`.
- Cards Streak/Tempo centralizados com ambient CSS leve. Sidebar desktop com pill emerald (sem moldura preta dupla).
- Momentum usa hora de SP. WeekStrip = 7 dias; retrospectiva = Seg–Dom.

### Playful 2.0

- Superfícies contextuais (treino/rotina/streak/XP/conquista) em `client/src/styles/surfaces.css`.
- Lembretes viraram rota `/lembretes`; som de notificação personalizado foi removido (campo legado ignorado).
- Missões (`quest_claims`) pagam XP fora do teto diário de ações, com orçamento fixo do catálogo.
- `GET /api/day` ganhou `momentum` e `week_retro` (janela de 14 dias).

---

### Rotina, Dia Ativo e Home 2.0

- `active_days` é a fonte do Streak. Toda ação diária válida passa por `recordValidDailyAction`.
- Atividades e rotinas saíram de `preferencias` para tabelas `activities`, `routines`, `routine_items`, `activity_logs`.
- Home passou a ser dashboard do dia (`GET /api/day`). Equilíbrio do core foi para Treino.
- Perfil: seções Evolução e Corpo; Definição em disclosure; `objetivo` não é editado quando existe `ab_training_profile_v2`.
- Recompensa de atividade: XP na primeira conclusão do dia (até 4 distintas), sem Folhas ilimitadas.
- Lembretes de atividade são derivados (`deriveActivityReminders`), não copiados para `lembretes_personalizados`.
- Fuso oficial do Dia Ativo permanece `America/Sao_Paulo`.

---

## 2026-09-01

### Organização e limpeza do projeto

- A documentação interna foi padronizada em `docs/internal/` para evitar a falsa impressão de que uma pasta chamada `private` seria confidencial em um repositório público.
- Assets oficiais da identidade passam a usar `docs/internal/logos-icons/` como fonte de verdade.
- O snapshot da antiga experiência RPG/AFK permanece somente como material histórico em `docs/internal/Exploracao-rpg-afk/`.
- `NOTES.md` passa a registrar apenas decisões técnicas ativas e riscos relevantes.
- README e guia do usuário foram alinhados à identidade Evolyn, ao domínio atual e à nomenclatura **Treino**.

### Auditoria do produto atual

- A campanha narrativa, páginas de livro, feed, inventário visual e código RPG que ainda alcançavam o runtime foram removidos; o snapshot histórico continua isolado.
- A página pública passou de Missão/Construtor para **Treino**, com `/treino` canônica e redirecionamento de `/construtor`.
- Componentes, hooks, services, endpoints, testes e assets sem consumidor foram removidos após cruzamento de referências e análise estática.
- Contextos e hooks React foram separados para preservar Fast Refresh e reduzir exports mistos.
- Branding, metadata, PWA e ícones nativos foram sincronizados a partir da fonte oficial.
- A URL da API ficou configurável para builds nativos e o CORS do servidor passou a usar uma lista explícita de origens.
- Identificadores persistidos antigos continuam apenas onde a compatibilidade com contas, eventos e respostas existentes exige.

---

## Regras

Registrar aqui quando houver:

- mudança estrutural importante;
- decisão relevante para continuidade;
- bug difícil cuja causa vale preservar;
- pendência real criada durante uma tarefa;
- migration que exige contexto adicional;
- alteração relevante de arquitetura ou fluxo.

Não registrar:

- cada pequeno ajuste visual;
- lista completa de arquivos modificados;
- commits individuais;
- checks passando a cada tarefa;
- detalhes óbvios no código;
- bugs triviais já resolvidos.

Compacte ou remova informações antigas quando deixarem de ser úteis.
