<div align="center">

# Abdoria · Core Quest

**Seu treino de abdômen virou uma aventura.**

Desenvolvi o Abdoria para treinar em casa, ganhar pontos, desbloquear conquistas, personalizar o perfil e disputar o ranking — tudo de um jeito simples e motivador.

[![Demo](https://img.shields.io/badge/Demo-abdoria--project.vercel.app-000?style=for-the-badge&logo=vercel&logoColor=white)](https://abdoria-project.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase_Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

[App ao vivo](https://abdoria-project.vercel.app) · [Guia para quem vai usar o app](./docs/GUIA-DO-USUARIO.md) · [Instalação para desenvolvedores](#-instalação-rápida)

</div>

---

## O que é o Abdoria?

O **Abdoria** é um aplicativo web de treinos de **abdômen com peso corporal**. Você monta ou recebe treinos, executa exercício por exercício com timer e descanso, e acompanha sua evolução como se fosse um jogo.

Basta criar uma conta, passar pelo cadastro inicial e começar a treinar.

> **Importante:** o Abdoria é educacional e de entretenimento. **Não substitui** acompanhamento médico, nutricional ou de educação física.

---

## Para quem é?

| Perfil | O que você ganha |
|--------|------------------|
| **Iniciante** | Treinos sugeridos, exercícios explicados e progressão suave |
| **Quem treina em casa** | Biblioteca de exercícios, montagem de treino e player guiado |
| **Quem gosta de metas** | XP, streak, conquistas, loja diária e ranking |
| **Quem quer constância** | Calendário de treinos, patrulha AFK e recompensas diárias |

---

## O que você pode fazer no app

### Treinar de verdade
- Biblioteca com dezenas de exercícios de core (superior, inferior, oblíquos, flexões, etc.)
- Nomes em inglês com **tradução em português** entre parênteses
- Treinos prontos por ciclo (**A, B, C…**) ou **monte o seu** arrastando exercícios
- **Exercícios fixos** — marque na biblioteca o que sempre deve entrar na sugestão
- **Bloqueio de recomendação** — oculte exercícios que não quer ver nos treinos sugeridos
- **Rodada de ciclos** — ao completar todos os ciclos ativos, escolha manter ou sortear um novo set
- **Player interativo**: séries por tempo ou repetições, descanso configurável, botões na barra inferior
- Salve treinos favoritos na sua conta

### Evoluir e se motivar
- **XP diário** — exercícios do treino (mín. **3 exercícios**; **20 XP** por exercício)
- **Teto diário** — **100 XP + 5 por nível** (sobe conforme você evolui)
- **XP extra** — streak, conquistas, loja e habilidades desbloqueadas (sem limite diário)
- **Patrulha AFK** — seu herói acumula recompensas a cada **30 minutos** enquanto você está fora
- **Níveis**, **streak**, **conquistas** e **ranking** (XP, dias seguidos ou Abdoria)

### Personalizar e recompensar
- **Loja Abdoria** — avatares, bordas, fundos de HUD, títulos, sons e efeitos visuais
- **Loja diária** — recompensa grátis + ofertas que renovam todo dia
- **Código presente** — resgate em **Opções**
- Perfil com nível, IMC, simulador de definição e estatísticas

---

## Como funciona a “gamificação”?

Pense em **dois tipos de pontos**:

| Tipo | O que é | Limite |
|------|---------|--------|
| **XP diário** | Pontos dos exercícios do treino | Teto = **100 + 5 × nível** |
| **XP extra** | Bônus de streak, conquistas, loja, habilidades (+1 XP por habilidade nova) | Sem teto diário |

A moeda **Abdoria** você usa na loja de cosméticos e na loja diária. Você ganha **1 Abdoria a cada 10 XP** totais acumulados (conversão passiva ao longo do progresso).

Detalhes completos no **[Guia do usuário](./docs/GUIA-DO-USUARIO.md)**.

---

## Estrutura do projeto

```
Abdoria/
├── client/              → Interface (React + Vite + Tailwind)
├── server/              → API e regras do jogo (Node + Express)
├── supabase/migrations/ → Schema Postgres
├── shared/types/        → Tipos compartilhados entre front e back
├── api/                 → Entrada serverless na Vercel
├── docs/                → Documentação amigável
└── scripts/             → Setup, build e deploy
```

---

## Instalação rápida

> Seção para **desenvolvedores** ou quem for rodar o app no próprio computador.

### Pré-requisitos

- [Node.js](https://nodejs.org/) **20.x** (veja [`.nvmrc`](./.nvmrc))
- Projeto no [Supabase](https://supabase.com/) com Postgres

### Passos

```bash
git clone https://github.com/RDEsley/Abdoria.git
cd Abdoria
npm install
cp server/.env.example server/.env
# Edite server/.env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
npm run seed
npm run dev
```

| Serviço | Endereço local |
|---------|----------------|
| App (navegador) | http://localhost:5173 |
| API | http://localhost:3001 |
| Saúde da API | http://localhost:3001/api/health |

**Conta demo** (após `npm run seed` em ambiente **não produção**):

| E-mail | Senha |
|--------|-------|
| `admin@abdoria.local` | `admin123` |

> Em produção o seed **não** cria usuários demo. Nunca use senhas fracas em deploy real.

### Scripts úteis

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Sobe app + API juntos |
| `npm run build` | Gera versão de produção (client + server) |
| `npm run build:vercel` | Build usado no deploy (API serverless + client) |
| `npm run seed` | Popula exercícios, presets e admin demo (dev) |
| `npm run setup` | Assistente de configuração inicial |

Variáveis de ambiente locais: [`server/.env.example`](./server/.env.example).

---

## Deploy na Vercel

O projeto está configurado para deploy contínuo a partir da branch `main`.

**URL de produção:** https://abdoria-project.vercel.app

### Variáveis obrigatórias (Project Settings → Environment Variables)

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (somente servidor — nunca no client) |
| `SUPABASE_ANON_KEY` | Chave anon (opcional no server; útil se expandir client direto) |
| `JWT_SECRET` | Chave longa e aleatória para tokens de sessão |
| `JWT_EXPIRES_IN` | Ex.: `7d` (opcional; padrão no código) |

Modelo completo em [`.env.example`](./.env.example).

Remova `MONGODB_URI` se ainda existir no projeto Vercel — a v0.2.0 usa Supabase.

### Build

- **Install:** `npm install`
- **Build:** `npm run build:vercel`
- **Output:** `client/dist` + função em `api/index.mjs`
- **Node:** `20.x`

Após o primeiro deploy com Supabase configurado, rode `npm run seed` uma vez (local ou CI) para popular exercícios e presets.

---

## Documentação

| Documento | Público |
|-----------|---------|
| [Guia do usuário](./docs/GUIA-DO-USUARIO.md) | Quem vai **usar** o app |
| [Contribuindo](./CONTRIBUTING.md) | Quem vai **desenvolver** |

---

## Tecnologias

React 19 · TypeScript · Vite · Tailwind CSS · Framer Motion · Express 5 · Supabase Postgres · JWT · Vercel Serverless

---

## Licença

[MIT](./LICENSE)

---

<div align="center">

**Feito para transformar consistência em diversão.**

[Abrir um issue](https://github.com/RDEsley/Abdoria/issues) · [Ver app ao vivo](https://abdoria-project.vercel.app) · [Guia do usuário](./docs/GUIA-DO-USUARIO.md)

</div>
