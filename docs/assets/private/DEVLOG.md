# Evolyn — Development Log

Memória interna de desenvolvimento para agentes.

Este arquivo registra apenas acontecimentos recentes ou relevantes que possam ajudar
outro agente a continuar o projeto sem perder contexto.

Não precisa registrar cada arquivo alterado ou cada pequeno ajuste.
O Git continua sendo a fonte de verdade do histórico detalhado.

---

## 2026-09-01

### Organização e limpeza do projeto

- `CLAUDE.md` removido; `AGENTS.md` passa a concentrar as instruções para agentes.
- Conteúdo histórico do antigo RPG/AFK movido para `docs/assets/private/Exploracao-rpg-afk/`.
- Assets oficiais da identidade foram centralizados em `docs/assets/private/logos-icons/`.
- `docs/assets/private/logos-icons/` passa a ser a referência oficial para atualização das logos e ícones do projeto.
- `NOTES.md` foi reduzido para conter apenas decisões técnicas e riscos relevantes.
- A nomenclatura pública da página de treino está sendo padronizada de Missão/Construtor para Treino e `/treino`.

### Pendências observadas

- Fazer auditoria global para localizar logos antigas ainda utilizadas.
- Confirmar que metadata, favicon, PWA, Android e iOS utilizam a identidade atual.
- Continuar removendo referências antigas a Abdoria/RPG quando não forem necessárias por compatibilidade.

---

## Regras

Registrar aqui quando houver:

- mudança estrutural importante;
- decisão relevante tomada durante implementação;
- bug difícil cuja causa vale preservar;
- mudança de comportamento que outro agente precisa conhecer;
- pendência criada durante uma tarefa;
- migration criada ou que ainda exige ação;
- alteração relevante de arquitetura ou fluxo;
- contexto importante para continuar uma tarefa posteriormente.

Não registrar:

- cada pequeno ajuste visual;
- lista completa de arquivos modificados;
- commits individuais;
- build passando a cada tarefa;
- detalhes que já estão óbvios no código;
- bugs resolvidos triviais.

Quando uma informação antiga deixar de ter utilidade, ela pode ser removida ou condensada.
