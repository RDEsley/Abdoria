<div align="center">

# Abdoria · Core Quest

**Seu treino de abdômen virou uma aventura.**

Treine em casa, ganhe pontos, desbloqueie conquistas, personalize seu perfil e dispute o ranking — tudo de um jeito simples e motivador.

[![Demo](https://img.shields.io/badge/Demo-abdoria--project.vercel.app-000?style=for-the-badge&logo=vercel&logoColor=white)](https://abdoria-project.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)

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
| **Quem quer constância** | Calendário de treinos, lembretes visuais e recompensas diárias |

---

## O que você pode fazer no app

### Treinar de verdade
- Biblioteca com dezenas de exercícios de core (superior, inferior, oblíquos, etc.)
- Nomes em inglês com **tradução em português** entre parênteses
- Treinos prontos por ciclo (**A, B, C…**) ou **monte o seu** arrastando exercícios
- **Player interativo**: séries por tempo ou repetições, descanso configurável
- Salve treinos favoritos na sua conta

### Evoluir e se motivar
- **XP diário** — exercícios do treino (mín. **3 exercícios**; **20 XP** por exercício)
- **Teto diário** — **100 XP + 5 por nível** (sobe conforme você evolui)
- **XP extra** — streak, conquistas, loja e habilidades desbloqueadas (sem limite diário)
- **Níveis** — fórmula progressiva: quanto maior o nível, mais XP para subir
- **Streak** — dias seguidos treinando
- **Conquistas** — metas fáceis, médias, difíceis e lendárias
- **Ranking** — compare **XP**, **dias seguidos** ou moedas **Abdoria**

### Personalizar e recompensar
- **Loja Abdoria** — avatares, bordas, títulos, sons e efeitos visuais
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

Organização pensada para quem for dar manutenção no código:

```
Abdoria/
├── client/          → Interface (React + Vite + Tailwind)
├── server/          → API e regras do jogo (Node + Express + MongoDB)
├── shared/types/    → Tipos compartilhados entre front e back
├── api/             → Entrada serverless na Vercel
├── docs/            → Documentação amigável e técnica
└── scripts/         → Setup, cópia do build da API e deploy
```

---

## Instalação rápida

> Seção para **desenvolvedores** ou quem for rodar o app no próprio computador.

### Pré-requisitos

- [Node.js](https://nodejs.org/) **20.x** (veja [`.nvmrc`](./.nvmrc))
- Conta gratuita no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)

### Passos

```bash
git clone https://github.com/RDEsley/Abdoria.git
cd Abdoria
npm install
cp server/.env.example server/.env
# Edite server/.env com sua MONGODB_URI e JWT_SECRET
npm run seed
npm run dev
```

| Serviço | Endereço local |
|---------|----------------|
| App (navegador) | http://localhost:5173 |
| API | http://localhost:3001 |
| Saúde da API | http://localhost:3001/api/health |

**Conta demo** (após `npm run seed`):

| E-mail | Senha |
|--------|-------|
| `admin@abdoria.local` | `admin123` |

### Scripts úteis

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Sobe app + API juntos |
| `npm run build` | Gera versão de produção (client + server) |
| `npm run build:vercel` | Build usado no deploy (API serverless + client) |
| `npm run seed` | Popula exercícios, presets, NPCs do ranking e admin demo |
| `npm run setup` | Assistente de configuração inicial |

Variáveis de ambiente locais: [`server/.env.example`](./server/.env.example).

---

## Deploy na Vercel

O projeto está configurado para deploy contínuo a partir da branch `main`.

**URL de produção:** https://abdoria-project.vercel.app

### Variáveis obrigatórias (Project Settings → Environment Variables)

| Variável | Descrição |
|----------|-----------|
| `MONGODB_URI` | Connection string do MongoDB Atlas |
| `JWT_SECRET` | Chave longa e aleatória para tokens de sessão |
| `JWT_EXPIRES_IN` | Ex.: `7d` (opcional; padrão no código) |

Modelo completo em [`.env.example`](./.env.example).

### Build

- **Install:** `npm install` (instala raiz, `client/` e `server/` via `postinstall`)
- **Build:** `npm run build:vercel`
- **Output:** `client/dist` + função em `api/index.mjs`
- **Node:** `20.x` (definido em `package.json` → `engines`)

Após o primeiro deploy, rode `npm run seed` apontando para o mesmo banco Atlas para popular exercícios e usuários demo.

---

## Documentação

| Documento | Público |
|-----------|---------|
| [Guia do usuário](./docs/GUIA-DO-USUARIO.md) | Quem vai **usar** o app |
| [Contribuindo](./CONTRIBUTING.md) | Quem vai **desenvolver** |
| [Configurar página no GitHub](./docs/GITHUB-ABOUT.md) | Textos prontos para About / Topics |

---

## Tecnologias

React 19 · TypeScript · Vite · Tailwind CSS · Framer Motion · Express 5 · Mongoose · JWT · MongoDB Atlas · Vercel Serverless

---

## Licença

Projeto privado. Todos os direitos reservados.

---

<div align="center">

**Feito para transformar consistência em diversão.**

[Abrir um issue](https://github.com/RDEsley/Abdoria/issues) · [Ver app ao vivo](https://abdoria-project.vercel.app) · [Guia do usuário](./docs/GUIA-DO-USUARIO.md)

</div>
