# CLAUDE.md — Abdoria · Core Quest

App de treino de abdômen com camada RPG (XP, streak, exploração AFK, loja).
Meta atual: elevar o app a nível de portfólio profissional (referência de
design: Strava), finalizar migração para Supabase e reestruturar o código
seguindo clean code.

## Stack
React 19 · TypeScript 5.8 · Vite · Tailwind · Framer Motion · Express 5 ·
Supabase Postgres · JWT · Vercel Serverless

## Docs — leia antes de assumir, não repita conteúdo aqui
- `README.md` — visão geral do produto
- `docs/GUIA-DO-USUARIO.md` — regras de gamificação
- `docs/private/NOTES.md` — notas internas do Richard (git-ignored).
  Grave aqui sugestões, dívida técnica e decisões pendentes.
  **Nunca** transforme isso em comentário no código.

## Comandos
`npm run dev` · `build` · `build:vercel` · `seed` · `setup`
Scripts de validação em `scripts/dev/` (ver README para lista completa).

## Convenções de código
- Comentários: só o essencial pra manutenção. Sem comentário óbvio, sem
  qualquer marca de "gerado por IA" (nunca `// added by Claude` etc).
- Server segue camadas `domain/ → repositories/ → services/ → routes/`.
  Manter esse padrão em features novas.
- Cliente único de dados: **Supabase Postgres**. Proibido reintroduzir
  MongoDB ou qualquer driver relacionado.
- TypeScript estrito. Evitar `any`.

## Git — identidade obrigatória (inegociável)
```
user.name  = RDEsley
user.email = richardesleyso@gmail.com
```
Claude/Anthropic **nunca** aparece como autor, co-author, contribuidor ou
trailer de commit/tag. Sem `Co-authored-by: Claude` nem variações.

## Gatilho "Manda pro github"
Definido em `.claude/skills/manda-pro-github/SKILL.md`. Resumo: commit
direto na `main`, título em inglês (Conventional Commits), corpo em
português explicando o porquê, sem qualquer menção a IA.

## Guardrails
- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` / `JWT_SECRET` no client.
- Antes de apagar mais de 5 arquivos, listar e pedir confirmação.
- Redesenho de UI usa o Strava como referência de polish/UX — a
  identidade RPG (slimes, Dorias, bestiário) é mantida, não substituída.
