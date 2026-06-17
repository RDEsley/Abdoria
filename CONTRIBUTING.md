# Contribuindo com o Abdoria

Obrigado por considerar contribuir. Este projeto é mantido em português (Brasil).

## Antes de começar

1. Leia o [README](./README.md) e o [Guia do usuário](./docs/GUIA-DO-USUARIO.md) para entender o produto.
2. Configure o ambiente local (`npm install`, `server/.env`, `npm run seed`, `npm run dev`).
3. Abra uma **issue** para bugs ou ideias antes de grandes mudanças.

## Padrões de código

- **TypeScript** em client, server e `shared/types`.
- Siga o estilo existente: nomes em português no domínio (rotas, UI), inglês ok em infra.
- Mudanças **pequenas e focadas** — um assunto por PR.
- Não commite `.env`, secrets, `.cursor`, `.cursorignore` ou `.vercel`.

## Fluxo

```bash
git checkout -b feat/minha-melhoria
# ... alterações ...
npm run build
git commit -m "feat: descrição clara do porquê"
git push origin feat/minha-melhoria
```

Abra um Pull Request descrevendo **o que mudou** e **como testar**.

## Commits

Prefira mensagens curtas no imperativo:

- `feat: adiciona filtro na biblioteca`
- `fix: corrige XP diário após reset`
- `docs: atualiza guia do usuário`

## Reportar bugs

Use o template de **Bug report** e inclua:

- O que você esperava
- O que aconteceu
- Passos para reproduzir
- Navegador / dispositivo (se for UI)

## Dúvidas

Abra uma issue com o rótulo `question` ou entre em contato com o mantenedor do repositório.
