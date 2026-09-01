# Evolyn — Development Log

Memória curta de desenvolvimento para continuidade entre agentes e sessões.

O Git continua sendo a fonte de verdade do histórico detalhado.

---

## 2026-09-01

### Organização e limpeza do projeto

- A documentação interna foi padronizada em `docs/internal/` para evitar a falsa impressão de que uma pasta chamada `private` seria confidencial em um repositório público.
- Assets oficiais da identidade passam a usar `docs/internal/logos-icons/` como fonte de verdade.
- O snapshot da antiga experiência RPG/AFK permanece somente como material histórico em `docs/internal/Exploracao-rpg-afk/`.
- `NOTES.md` passa a registrar apenas decisões técnicas ativas e riscos relevantes.
- README e guia do usuário foram alinhados à identidade Evolyn, ao domínio atual e à nomenclatura **Treino**.

### Auditoria do produto atual

- A campanha narrativa, páginas de livro, feed, inventário visual e código RPG que ainda alcançavam o runtime foram removidos; o snapshot histórico continua isolado.
- A página pública passou de Missão/Construtor para **Treino**, com `/treino` canônica e redirecionamento de `/construtor`.
- Componentes, hooks, services, endpoints, testes e assets sem consumidor foram removidos após cruzamento de referências e análise estática.
- Contextos e hooks React foram separados para preservar Fast Refresh e reduzir exports mistos.
- Branding, metadata, PWA e ícones nativos foram sincronizados a partir da fonte oficial.
- A URL da API ficou configurável para builds nativos e o CORS do servidor passou a usar uma lista explícita de origens.
- Identificadores persistidos antigos continuam apenas onde a compatibilidade com contas, eventos e respostas existentes exige.

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
