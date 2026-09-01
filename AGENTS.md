# AGENTS.md

## Instruções para agentes

Este arquivo contém apenas regras permanentes para agentes trabalhando no projeto.

Mantenha-o curto.

Atualize este `AGENTS.md` somente quando surgir uma decisão duradoura sobre arquitetura, processo, Git ou funcionamento do projeto. Não registre histórico de tarefas, prompts, bugs já resolvidos ou changelogs aqui.

Para contexto técnico e decisões internas, consulte também `docs/assets/private/NOTES.md`.

---

## Projeto

**Evolyn**

Aplicativo mobile-first de evolução pessoal gamificada.

Stack principal:

* React + TypeScript + Vite
* Node.js + Express
* Supabase/PostgreSQL
* Capacitor
* Vercel

Aplicação:

https://evolyn-core-quest.vercel.app

Repositório:

https://github.com/RDEsley/Evolyn-Core-Quest

---

## Memória do projeto

Antes de alterações relevantes, leia:

- `docs/assets/private/README.md`
- `docs/assets/private/NOTES.md`
- as entradas recentes de `docs/assets/private/DEVLOG.md`

### `NOTES.md`

Use para decisões técnicas duradouras, compatibilidades, riscos e regras que futuros
agentes precisam conhecer.

### `DEVLOG.md`

Use como memória contínua do desenvolvimento.

Ao concluir uma tarefa relevante, avalie se houve alguma mudança, decisão, descoberta,
pendência ou contexto que seria útil para um próximo agente.

Se houver, atualize `docs/assets/private/DEVLOG.md` de forma curta e objetiva.

Não registre cada alteração realizada e não transforme o DEVLOG em uma cópia do Git.

Ao atualizar o DEVLOG:

- prefira resumir por tarefa ou conjunto de mudanças;
- registre o motivo de decisões não óbvias quando relevante;
- mantenha pendências realmente abertas;
- remova ou compacte informações que perderam utilidade;
- evite crescimento indefinido do arquivo.

---

## Direção atual

A identidade oficial é **Evolyn**.

Conceitos públicos atuais incluem:

* Treino
* Atividades
* MyPlant
* XP
* Streak
* Conquistas
* Folhas
* Folhas douradas
* Ranking
* Perfil e personalização

Evite reintroduzir nomenclaturas antigas como Abdoria, Dorias, Coins, Gems, Missão, Construtor, RPG ou AFK na interface/documentação atual.

Identificadores internos antigos podem permanecer quando forem necessários para compatibilidade com banco ou código existente.

A rota pública principal da área de treino é:

```text
/treino
```

---

## Legado

`docs/assets/private/Exploracao-rpg-afk/` é um snapshot histórico.

Não utilizar código, assets ou dependências desse diretório no runtime atual sem uma decisão explícita.

Não permitir que conteúdo histórico interfira em build, lint, testes ou arquitetura principal.

---

## Banco de dados

Migrations aplicadas são histórico imutável.

Não editar migrations antigas para refletir o estado atual.

Mudanças de schema devem gerar novas migrations.

Evite salvar snapshots completos de `profiles` quando apenas parte do perfil foi alterada.

Prefira escritas parciais, como `saveColumns(...)`, quando aplicável, para reduzir risco de sobrescrever alterações concorrentes.

Tenha cuidado especial com escritas concorrentes em `preferencias`.

---

## Qualidade de código

Priorize:

1. legibilidade;
2. simplicidade;
3. consistência;
4. manutenção;
5. segurança.

Antes de criar uma nova abstração, componente, hook ou helper, verifique se já existe solução equivalente.

Não faça refatorações grandes apenas por preferência estética.

Remova código morto quando confirmar que não possui consumidores.

Comentários devem explicar decisões ou comportamentos não óbvios, não repetir o próprio código.

Não deixe código comentado, logs de debug ou TODOs resolvidos.

---

## Mobile-first

A experiência principal do Evolyn é mobile.

Ao alterar UI:

* priorize telas pequenas;
* evite overflow horizontal;
* preserve áreas de toque adequadas;
* mantenha acessibilidade;
* respeite `prefers-reduced-motion`;
* mantenha desktop funcional e responsivo.

Alterações relacionadas a recursos nativos devem considerar Web, Android e iOS quando aplicável.

---

## Validação

Antes de considerar uma alteração relevante concluída, execute os checks aplicáveis existentes no projeto.

Base:

```bash
npm run format:check
npm run lint
npm test
npm run build
```

Quando houver alteração relacionada ao Capacitor/native:

```bash
npm run cap:sync
```

Não desative lint, TypeScript ou testes apenas para fazer os checks passarem.

Não remova testes úteis para esconder regressões.

---

## Identidade Git obrigatória

Antes de criar commits ou tags, confirme a identidade local:

```bash
git config user.name "RDEsley"
git config user.email "richardesleyso@gmail.com"
```

Commits e tags devem utilizar exclusivamente essa identidade.

Não adicionar:

* Co-authored-by de IA;
* trailers de ferramentas;
* autoria automática de agentes;
* menções a ChatGPT, Codex, Claude ou outras IAs.

---

## Git

Trabalhe com boas práticas de versionamento.

Prefira:

* commits pequenos e coerentes;
* Conventional Commits;
* mensagens claras;
* staging explícito;
* histórico compreensível;
* mudanças relacionadas agrupadas;
* revisão do diff antes do commit.

Evite:

* `git add .` sem revisar o que será enviado;
* commits gigantes misturando assuntos sem necessidade;
* force push;
* `reset --hard`;
* rebase destrutivo;
* apagar trabalho existente do usuário;
* alterar histórico publicado sem necessidade.

Não faça push automaticamente ao concluir uma tarefa comum.

---

## Gatilho: "Manda pro github"

Quando o usuário disser:

* `Manda pro github`
* `Manda pro git`
* `Sobe pro GitHub`
* `Commita e envia`

ou equivalente, execute o fluxo Git completo sem pedir nova confirmação.

### Fluxo

1. Verifique:

```bash
git status
git diff
git branch --show-current
git remote -v
git log --oneline -10
```

2. Confirme que o `origin` corresponde ao repositório correto.

3. Confirme a identidade Git obrigatória.

4. Revise as alterações e separe commits quando houver mudanças logicamente independentes.

5. Execute os checks relevantes para as alterações realizadas.

6. Faça staging explícito somente dos arquivos corretos.

7. Revise:

```bash
git diff --cached
```

8. Crie commits seguindo Conventional Commits.

Exemplos:

```text
feat: improve workout experience
fix: prevent duplicate profile updates
refactor: simplify activity persistence
docs: update Evolyn documentation
chore: remove unused legacy assets
```

9. Faça o push para o remote correto.

10. Se a entrega justificar uma nova versão, utilize SemVer e crie uma tag coerente.

11. Ao terminar, informe resumidamente:

* commits criados;
* branch;
* push realizado;
* tag criada, se houver;
* checks executados;
* qualquer pendência real.

---

## Regra final

Atue com autonomia.

Se encontrar durante uma tarefa um problema pequeno, claro e diretamente relacionado ao que está sendo alterado, corrija-o.

Não aumente desnecessariamente o escopo com grandes refatorações não solicitadas.

Não preserve código ruim ou legado apenas porque “pode ser útil no futuro”: o Git já mantém o histórico.

Ao mesmo tempo, não remova ou reescreva algo importante sem antes entender seus consumidores, contratos e impacto.
