<div align="center">

<img src="assets/logo.png" alt="Abdoria" width="120" />

# Abdoria

Treinos gamificados de abdômen com peso corporal — auth JWT, player interativo, XP, streaks e ranking.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)

</div>

---

## Sobre

O **Abdoria** é uma aplicação full-stack para treinos de core em casa. O usuário passa por onboarding, monta ou recebe treinos recomendados por nível e objetivo, executa séries no player interativo e acompanha evolução com gamificação.

> **Aviso:** aplicativo educacional. Não substitui orientação de profissionais de saúde.

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| Autenticação | Cadastro, login, visitante e JWT |
| Onboarding | Perfil, termos, nível, objetivo e preferências |
| Biblioteca | 30 exercícios com filtros por músculo |
| Construtor | Presets recomendados (ciclos A–E) e treino customizado |
| Player | Séries manual (reps/tempo), descanso configurável |
| Gamificação | XP diário (teto 100), streaks e conquistas |
| Ranking | Leaderboard por XP ou streak |

## Estrutura do repositório

```
abdoria/
├── assets/                 # Logo e recursos para documentação
├── client/                 # Front-end React + Vite + Tailwind
│   ├── public/brand/       # Logo e favicons
│   └── src/
│       ├── components/     # UI, auth, gamificação, legal
│       ├── context/        # Auth e estado global
│       ├── lib/            # API, storage, utils, sons
│       └── pages/          # Rotas da aplicação
├── server/                 # API Express + Mongoose
│   └── src/
│       ├── models/         # Schemas MongoDB
│       ├── routes/         # Endpoints REST
│       ├── services/       # Gamificação e regras de negócio
│       └── seeds/          # Exercícios e presets
├── shared/types/           # Tipos TypeScript compartilhados
└── package.json            # Scripts do monorepo
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- Conta no [MongoDB Atlas](https://cloud.mongodb.com)

## Instalação

```bash
git clone https://github.com/SEU_USUARIO/abdoria.git
cd abdoria

npm install
npm install --prefix client
npm install --prefix server
```

### Variáveis de ambiente

```bash
cp server/.env.example server/.env
```

Edite `server/.env`:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/abdoria
PORT=3001
JWT_SECRET=sua-chave-secreta-longa-e-aleatoria
JWT_EXPIRES_IN=7d
```

### MongoDB Atlas

1. Crie um cluster (tier gratuito).
2. **Database Access** — usuário com senha.
3. **Network Access** — libere seu IP de desenvolvimento.
4. Cole a connection string em `MONGODB_URI`.

**Índices recomendados** (`users`):

| Campo | Tipo |
|-------|------|
| `email` | unique |
| `gamificacao.nivel_xp` | descending |
| `gamificacao.streak_atual` | descending |

### Seed

```bash
npm run seed
```

Cria 30 exercícios, 15 presets e usuário demo:

| Email | Senha |
|-------|-------|
| `admin@abdoria.local` | `admin123` |

## Desenvolvimento

```bash
npm run dev
```

| Serviço | URL |
|---------|-----|
| Front-end | http://localhost:5173 |
| API | http://localhost:3001 |
| Health | http://localhost:3001/api/health |

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Client + server em paralelo |
| `npm run build` | Build de produção |
| `npm run seed` | Popula banco de dados |

## API (principais rotas)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/register` | Cadastro |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/users/me` | Perfil autenticado |
| `PATCH` | `/api/users/me/onboarding` | Concluir onboarding |
| `GET` | `/api/presets/recommended` | Presets do usuário |
| `GET` | `/api/leaderboard` | Ranking |
| `POST` | `/api/workouts/complete` | Registrar treino |

## Licença

Projeto privado. Todos os direitos reservados.
