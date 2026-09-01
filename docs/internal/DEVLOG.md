# Evolyn — Development Log

Memória curta de desenvolvimento para continuidade entre agentes e sessões.

O Git continua sendo a fonte de verdade do histórico detalhado.

---

## 2026-09-01

### Organização e limpeza do projeto

- `CLAUDE.md` removido; `AGENTS.md` concentra as regras permanentes para agentes.
- A documentação interna foi padronizada em `docs/internal/` para evitar a falsa impressão de que uma pasta chamada `private` seria confidencial em um repositório público.
- Assets oficiais da identidade passam a usar `docs/internal/logos-icons/` como fonte de verdade.
- O snapshot da antiga experiência RPG/AFK permanece somente como material histórico em `docs/internal/Exploracao-rpg-afk/`.
- `NOTES.md` passa a registrar apenas decisões técnicas ativas e riscos relevantes.
- README e guia do usuário foram alinhados à identidade Evolyn, ao domínio atual e à nomenclatura **Treino**.

### Pendências úteis

- Fazer auditoria global das logos e ícones ainda consumidos pelo runtime.
- Confirmar visualmente favicon, metadata/Open Graph, PWA, Android e iOS após a atualização de branding.
- Continuar removendo textos públicos antigos sem renomear identificadores persistidos que ainda sejam necessários por compatibilidade.
- Avaliar futuramente se o snapshot RPG/AFK deve permanecer na árvore principal ou ser preservado apenas por tag/branch histórica para reduzir o peso do repositório.

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
