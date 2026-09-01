# Mídia dos exercícios

Os GIFs publicados nesta pasta são referenciados pelo campo `media.gif` dos exercícios ativos em `server/src/db/seeds/`.

Regras de manutenção:

- use nomes em kebab-case e mantenha um arquivo por mídia realmente exibida;
- atualize o seed e este diretório juntos;
- não adicione mídia para exercícios listados como retirados em `shared/exercises.ts`;
- a interface usa `/media/exercises/{arquivo}.gif` e exibe um fallback quando o arquivo não carrega.

Para auditar o conjunto, compare os valores de `media.gif` dos seeds com os nomes desta pasta. Assets de exercícios retirados ficam preservados apenas no histórico do Git.
