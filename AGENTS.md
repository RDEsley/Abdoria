# AGENTS.md

## Instruções para agentes

Este arquivo contém apenas regras permanentes para agentes trabalhando no Evolyn.

Mantenha-o curto e atualize-o somente quando surgir uma decisão duradoura sobre arquitetura, processo, Git ou funcionamento do projeto. Não use este arquivo como changelog, histórico de prompts ou lista de tarefas concluídas.

## Projeto

**Evolyn** — aplicativo mobile-first de evolução pessoal gamificada.

Stack principal:

- React + TypeScript + Vite
- Node.js + Express
- Supabase/PostgreSQL
- Capacitor
- Vercel

Aplicação: https://evolyn-core-quest.vercel.app

Repositório: https://github.com/RDEsley/Evolyn-Core-Quest

## Memória do projeto

Antes de alterações relevantes, consulte:

- `docs/internal/README.md`
- `docs/internal/NOTES.md`
- entradas recentes de `docs/internal/DEVLOG.md`

Use:

- `NOTES.md` para decisões técnicas atuais, compatibilidades, riscos e regras não óbvias;
- `DEVLOG.md` para contexto recente que realmente ajude o próximo agente.

Não replique o histórico do Git nesses arquivos.

## Direção atual

A identidade pública oficial é **Evolyn**.

Conceitos atuais incluem:

- Treino
- Atividades
- MyPlant
- XP
- Streak
- Conquistas
- Folhas
- Folhas douradas
- Ranking
- Perfil e personalização

Evite reintroduzir na interface ou documentação atual nomenclaturas antigas como Abdoria, Dorias, Coins, Gems, Construtor, RPG ou AFK.

Identificadores internos legados podem permanecer quando necessários para compatibilidade com banco, storage, eventos ou APIs existentes. Não renomeie identificadores persistidos apenas por estética.

A rota pública principal da área de treino é:

```text
/treino
```

## Branding

A fonte de verdade dos assets originais da marca é:

```text
docs/internal/logos-icons/
```

Não importe arquivos dessa pasta diretamente no runtime. Gere ou copie as variantes adequadas para `client/public/brand/`, Android e iOS.

Ao alterar a marca, verifique favicon, manifest/PWA, Open Graph/metadata, splash, Android e iOS.

## Legado

`docs/internal/Exploracao-rpg-afk/` é apenas um snapshot histórico.

Não registrar código desse diretório no runtime, build, lint ou testes sem decisão explícita. Reaproveitamento futuro deve respeitar a arquitetura e identidade atuais.

## Banco de dados

- Migrations aplicadas são histórico imutável.
- Mudanças de schema devem gerar novas migrations.
- Prefira escritas parciais quando apenas parte do perfil mudou.
- Tenha cuidado com escritas concorrentes em `preferencias`.
- Não renomeie campos persistidos legados sem migration e plano de compatibilidade.

## Qualidade de código

Priorize legibilidade, simplicidade, consistência, manutenção e segurança.

Antes de criar abstração, componente, hook ou helper, verifique se já existe solução equivalente.

Não faça grandes refatorações apenas por preferência estética. Remova código morto somente depois de confirmar que não possui consumidores.

Não deixe logs de debug, código comentado ou TODOs já resolvidos.

## Mobile-first

A experiência principal do Evolyn é mobile.

Ao alterar UI:

- priorize telas pequenas;
- evite overflow horizontal;
- preserve áreas de toque adequadas;
- mantenha acessibilidade;
- respeite `prefers-reduced-motion`;
- mantenha desktop funcional e responsivo.

Recursos nativos devem considerar Web, Android e iOS quando aplicável.

## Validação

Antes de concluir uma alteração relevante, execute os checks aplicáveis:

```bash
npm run format:check
npm run lint
npm test
npm run build
```

Para alterações relacionadas ao Capacitor/native:

```bash
npm run cap:sync
```

Não desative lint, TypeScript ou testes apenas para fazer os checks passarem.

## Identidade Git

Antes de criar commits ou tags:

```bash
git config user.name "RDEsley"
git config user.email
```

O `user.name` deve ser `RDEsley`. O e-mail deve ser um endereço já configurado e verificado na conta GitHub do mantenedor; não sobrescreva o e-mail automaticamente.

Não adicionar trailers ou autoria automática de ferramentas/IA.

## Git

- Branch canônica: `main`.
- Commits pequenos, Conventional Commits, staging explícito.
- Contribuições externas: branch + PR (ver `CONTRIBUTING.md`).
- Mantenedor/agentes: preferir uma branch temporária por entrega quando `main` exigir PR; validar antes de merge.

## Gatilho: "Manda pro github"

Quando o usuário disser `Manda pro github`, `Manda pro git`, `Sobe pro GitHub`, `Commita e envia` ou equivalente, execute o fluxo Git completo sem pedir nova confirmação.

Antes do commit, revise:

```bash
git status
git diff
git branch --show-current
git remote -v
git log --oneline -10
```

Depois:

1. informe resumidamente commits, checks e destino do push.

Nunca envie secrets, arquivos locais, dumps, builds ou material ignorado apenas para completar o commit.
