<div align="center">

# Abdoria · Core Quest

**Seu treino de abdômen virou uma aventura.**

Treine em casa, ganhe pontos, desbloqueie conquistas, personalize seu perfil e dispute o ranking — tudo de um jeito simples e motivador.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)

[Guia para quem vai usar o app](./docs/GUIA-DO-USUARIO.md) · [Instalação para desenvolvedores](#-instalação-rápida)

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
- Treinos prontos por ciclo (**A, B, C…**) ou **monte o seu** arrastando exercícios
- **Player interativo**: séries por tempo ou repetições, descanso configurável
- Salve treinos favoritos na sua conta

### Evoluir e se motivar
- **XP diário** — só conta exercício do treino (até **100 XP/dia**; mínimo **3 exercícios**; **20 XP** por exercício)
- **XP extra** — streak, conquistas, loja e habilidades desbloqueadas (sem limite diário)
- **Streak** — dias seguidos treinando
- **Conquistas** — metas fáceis, médias, difíceis e lendárias
- **Ranking** — compare XP, dias seguidos ou moedas **Abdoria** com outros atletas

### Personalizar e recompensar
- **Loja Abdoria** — avatares, bordas, títulos, sons e efeitos visuais
- **Loja diária** — recompensa grátis + ofertas que renovam todo dia
- **Código presente** — resgate em **Opções** (ex.: código promocional)
- Perfil com nível, IMC, simulador de definição e estatísticas

---

## Como funciona a “gamificação”?

Pense em **dois tipos de pontos**:

| Tipo | O que é | Limite |
|------|---------|--------|
| **XP diário** | Pontos dos exercícios do treino | Máx. **100/dia** (5 exercícios × 20 XP) |
| **XP extra** | Bônus de streak, conquistas, loja, etc. | Sem teto diário |

A moeda **Abdoria** você usa na loja de cosméticos e na loja diária. Parte dela vem do seu progresso de XP ao longo do tempo.

Detalhes completos no **[Guia do usuário](./docs/GUIA-DO-USUARIO.md)**.

---

## Estrutura do projeto

Organização pensada para quem for dar manutenção no código:

```
Abdoria/
├── client/          → Interface (React + Vite + Tailwind)
├── server/          → API e regras do jogo (Node + Express + MongoDB)
├── shared/types/    → Tipos compartilhados entre front e back
├── docs/            → Documentação amigável e técnica
└── scripts/         → Setup e deploy
```

---

## Instalação rápida

> Seção para **desenvolvedores** ou quem for rodar o app no próprio computador.

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
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
| `npm run build` | Gera versão de produção |
| `npm run seed` | Popula exercícios, presets e usuário demo |
| `npm run setup` | Assistente de configuração inicial |

Variáveis de ambiente: veja [`server/.env.example`](./server/.env.example).

---

## Documentação

| Documento | Público |
|-----------|---------|
| [Guia do usuário](./docs/GUIA-DO-USUARIO.md) | Quem vai **usar** o app |
| [Contribuindo](./CONTRIBUTING.md) | Quem vai **desenvolver** |
| [Configurar página no GitHub](./docs/GITHUB-ABOUT.md) | Textos prontos para About / Topics |

---

## Tecnologias

React 19 · TypeScript · Vite · Tailwind CSS · Framer Motion · Express 5 · Mongoose · JWT · MongoDB Atlas

---

## Licença

Projeto privado. Todos os direitos reservados.

---

<div align="center">

**Feito para transformar consistência em diversão.**

[Abrir um issue](https://github.com/RDEsley/Abdoria/issues) · [Ver guia do usuário](./docs/GUIA-DO-USUARIO.md)

</div>
