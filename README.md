<div align="center">

<img src="./client/public/brand/logo.png" width="220" alt="Logo oficial do Evolyn" />

# 🌱 Evolyn

### Plantando a sua evolução.

**Evolução pessoal com treino, organização e gamificação em uma experiência mobile-first.**

[![Acessar o app](https://img.shields.io/badge/ACESSAR_O_APP-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://evolyn-core-quest.vercel.app)
[![Licença](https://img.shields.io/badge/LICENÇA-SOURCE--AVAILABLE-C2410C?style=for-the-badge)](./LICENSE)
[![CI](https://github.com/RDEsley/Evolyn-Core-Quest/actions/workflows/ci.yml/badge.svg)](https://github.com/RDEsley/Evolyn-Core-Quest/actions/workflows/ci.yml)

<br>

[🌐 Demonstração](https://evolyn-core-quest.vercel.app) •
[📖 Guia do usuário](./docs/GUIA-DO-USUARIO.md) •
[🚀 CI/CD](./docs/DEPLOYMENT.md) •
[⚙️ Instalação](#️-instalação) •
[👨‍💻 Desenvolvedor](#-desenvolvedor)

</div>

---

## 🎯 Sobre o projeto

O **Evolyn** é um aplicativo mobile-first de evolução pessoal gamificada.

A proposta é reunir em uma única experiência recursos para manter constância em treinos, atividades e organização pessoal, transformando progresso real em **XP, streaks, conquistas, Folhas e evolução de perfil**.

O projeto combina uma interface inspirada em jogos com ferramentas práticas para o dia a dia, sem depender da camada de gamificação para continuar sendo útil.

> 🩺 O Evolyn possui finalidade educacional, organizacional e de entretenimento. Recursos de treino não substituem acompanhamento de profissionais de saúde ou educação física.

---

## ✨ Principais funcionalidades

### 💪 Treinos

- Biblioteca de exercícios com foco em movimentos de peso corporal
- Treinos sugeridos por intensidade e preferências
- Criação e salvamento de rotinas personalizadas
- Fila de treino reorganizável
- Séries, repetições, duração e descanso configuráveis
- Player guiado para exercícios por tempo ou repetições
- Recuperação de sessão interrompida
- Histórico e acompanhamento de progresso
- Favoritos, exercícios fixados e restrições de recomendação

### ✅ Atividades e organização

- Atividades pessoais como estudo, leitura, corrida, meditação e alongamento
- Agenda configurável por dia da semana
- Lista de tarefas
- Bloco de Notas
- Histórico visual das atividades concluídas
- Lembretes e notificações pessoais, inclusive recorrentes

### 🎮 Progressão

- XP e evolução de nível
- Streak de constância
- Conquistas e recompensas
- Folhas como moeda de progressão
- Folhas douradas ligadas à evolução futura do MyPlant
- Perfil e personalizações desbloqueáveis

### 🏆 Ranking e comunidade

- Ranking semanal e global
- Comparação por XP, Folhas e dias seguidos
- Ranking entre amigos
- Perfis públicos e estatísticas de progresso

### 🌱 MyPlant

O **MyPlant** é uma experiência em desenvolvimento dentro do Evolyn. A proposta é expandir a representação visual da evolução do usuário.

---

## 🖼️ Preview

<div align="center">

<img src="./docs/assets/preview-home.png" width="48%" alt="Tela inicial do Evolyn" />
<img src="./docs/assets/preview-training.png" width="48%" alt="Tela de treino do Evolyn" />

<br>

<img src="./docs/assets/preview-profile.png" width="48%" alt="Perfil do usuário no Evolyn" />

</div>

---

## 🧩 Tecnologias

<div align="center">

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

</div>

### Stack principal

- **React + TypeScript + Vite** no frontend
- **Tailwind CSS** e **Framer Motion** na interface
- **Node.js + Express** no backend
- **Supabase/PostgreSQL** para persistência
- **JWT** na autenticação da API
- **Capacitor** para Android e iOS
- **Vercel** para aplicação web e funções serverless
- **GitHub Actions** para qualidade contínua

---

## 🗂️ Estrutura do projeto

```text
Evolyn-Core-Quest/
├── client/                 # Aplicação React
├── server/                 # API e regras de negócio
├── shared/                 # Tipos e utilitários compartilhados
├── api/                    # Entrada serverless da Vercel
├── supabase/migrations/    # Histórico de migrations
├── android/                # Projeto Android via Capacitor
├── ios/                    # Projeto iOS via Capacitor
├── scripts/                # Automação e manutenção
├── docs/                   # Documentação pública
│   ├── assets/             # Imagens usadas na documentação
│   └── internal/           # Memória técnica e referências internas versionadas
└── .github/                # CI, templates e governança do repositório
```

> `docs/internal/` é interno no sentido de manutenção do projeto, mas continua versionado. Não deve conter credenciais, dados pessoais ou qualquer informação que precise ser secreta.

---

## ⚙️ Instalação

### Pré-requisitos

- Node.js 22.x
- Git
- Projeto no Supabase

### Clone

```bash
git clone https://github.com/RDEsley/Evolyn-Core-Quest.git
cd Evolyn-Core-Quest
```

### Dependências

```bash
npm install
```

### Variáveis de ambiente

Use os arquivos `.env.example` como referência e mantenha valores reais apenas em arquivos ignorados pelo Git ou nas variáveis do ambiente de deploy.

Variáveis principais do backend:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CORS_ORIGINS=
```

Para builds nativos ou quando frontend e API usam origens diferentes, configure no cliente:

```env
VITE_API_BASE_URL=https://evolyn-core-quest.vercel.app
```

Na Web hospedada junto da API, a variável pode ficar vazia e o cliente usa `/api`.

> 🔐 Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, JWT secrets ou outras credenciais no frontend ou no repositório.

### Banco de dados

Aplique as migrations em:

```text
supabase/migrations/
```

Com Supabase CLI, quando aplicável:

```bash
supabase db push
```

### Dados iniciais

```bash
npm run seed
```

### Desenvolvimento

```bash
npm run dev
```

| Serviço | Endereço |
| --- | --- |
| Aplicação | `http://localhost:5173` |
| API | `http://localhost:3001` |
| Health check | `http://localhost:3001/api/health` |

---

## 📜 Scripts principais

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia frontend e backend |
| `npm run build` | Gera o build de produção |
| `npm run build:vercel` | Gera o build usado pela Vercel |
| `npm run format:check` | Valida formatação |
| `npm run lint` | Executa análise estática |
| `npm test` | Executa os testes do servidor |
| `npm run cap:sync` | Sincroniza projetos nativos |
| `npm run seed` | Popula dados iniciais |
| `npm run setup` | Executa o assistente de configuração |

---

## ✅ Qualidade

O repositório possui CI com gates de:

```bash
npm run format:check
npm run lint
npm test
npm run build
```

Mudanças relacionadas aos apps nativos também devem considerar:

```bash
npm run cap:sync
```

---

## ☁️ Deploy

A aplicação web está preparada para deploy contínuo na **Vercel**.

```text
Install Command: npm install
Build Command: npm run build:vercel
Node.js: 22.x
```

Produção:

**https://evolyn-core-quest.vercel.app**

---

## 📚 Documentação

| Documento | Descrição |
| --- | --- |
| [Guia do usuário](./docs/GUIA-DO-USUARIO.md) | Uso do aplicativo |
| [Identidade visual](./docs/BRANDING.md) | Branding e geração de assets |
| [Preparação Capacitor](./docs/CAPACITOR-READINESS.md) | Estado dos apps nativos |
| [CI/CD e deploy](./docs/DEPLOYMENT.md) | Fluxo de deploy e qualidade |
| [Guia de contribuição](./CONTRIBUTING.md) | Convenções para contribuições |
| [Segurança](./SECURITY.md) | Política de reporte de vulnerabilidades |
| [Licença](./LICENSE) | Termos de uso do código |

---

## 🗺️ Em evolução

O Evolyn está em desenvolvimento ativo. Entre os focos atuais estão:

- evolução do MyPlant;
- melhorias na experiência de atividades e organização;
- expansão de conquistas e personalizações;
- refinamento dos sistemas sociais e de ranking;
- melhoria contínua da experiência mobile e dos apps nativos.

---

## 🤝 Contribuições e licença

O Evolyn aceita contribuições da comunidade, mas **não é um projeto open source**.

O código é disponibilizado publicamente em modelo **source-available** para transparência, revisão e colaboração.

Você pode, nos limites do [LICENSE](./LICENSE):

- visualizar o código;
- criar fork/clone quando necessário para preparar uma contribuição;
- executar e modificar o projeto localmente para desenvolver e testar essa contribuição;
- enviar issues e Pull Requests ao repositório oficial.

Você **não pode**, sem autorização por escrito:

- hospedar ou publicar uma cópia do Evolyn;
- reutilizar o código ou assets em outro aplicativo/produto;
- distribuir, vender ou sublicenciar o projeto;
- criar clones, rebrands ou versões derivadas;
- usar a marca, logos ou identidade visual como se fossem suas.

Leia também o [Guia de contribuição](./CONTRIBUTING.md).

> A disponibilidade pública do repositório não transforma o Evolyn em software open source. O GitHub pode permitir visualização e forks conforme os termos da própria plataforma; isso não concede direitos adicionais de uso, distribuição ou comercialização do projeto.

---

## 👨‍💻 Desenvolvedor

<div align="center">

<img src="https://github.com/RDEsley.png" width="110" alt="Richard Esley" />

### Richard Esley

**Desenvolvedor Full Stack · UI/UX**

[![Portfólio](https://img.shields.io/badge/Portfólio-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://richardesley-dev.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RDEsley)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/richardesley/)

</div>

---

<div align="center">

### 🌱 Plantando a sua evolução.

[🌐 Abrir o aplicativo](https://evolyn-core-quest.vercel.app) •
[🐛 Reportar um problema](https://github.com/RDEsley/Evolyn-Core-Quest/issues) •
[📖 Guia do usuário](./docs/GUIA-DO-USUARIO.md)

</div>
