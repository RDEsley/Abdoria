# Contribuindo com o Evolyn

Obrigado por considerar contribuir com o Evolyn.

O projeto aceita colaboração por **issues, correções, melhorias, documentação, testes e Pull Requests**, mas o código é **source-available, não open source**.

Antes de contribuir, leia o [LICENSE](./LICENSE).

## O que a licença permite ao colaborador

Para preparar uma contribuição ao Evolyn, você pode:

- visualizar e estudar o código;
- criar fork ou clone quando necessário para contribuir;
- executar o projeto localmente para desenvolver e testar sua contribuição;
- modificar o código localmente;
- enviar Pull Requests para o repositório oficial.

Essas permissões existem **somente para colaboração com o Evolyn**.

A licença não autoriza publicar uma cópia do app, hospedar uma versão própria, reutilizar o código em outro produto, redistribuir o projeto, criar um clone/rebrand ou comercializar uma versão derivada.

## Antes de começar

1. Leia o [README](./README.md) e o [Guia do usuário](./docs/GUIA-DO-USUARIO.md).
2. Leia o [LICENSE](./LICENSE).
3. Use Node.js 22 e configure o ambiente local.
4. Abra uma **issue** antes de mudanças grandes ou que alterem arquitetura/produto.
5. Nunca inclua credenciais, dados reais de usuários ou segredos em issues, commits ou Pull Requests.

## Padrões de código

- Use **TypeScript** no client, server e módulos compartilhados.
- Preserve o estilo e a arquitetura existentes.
- Identificadores de entidade usam `id` (UUID Postgres), não `_id`.
- Prefira mudanças pequenas e focadas.
- Não edite migrations já aplicadas apenas para reorganização ou estética.
- Não commite `.env`, `.env.vercel.*`, secrets, chaves de assinatura, dumps, `.vercel/` ou arquivos locais.

## Fluxo sugerido (contribuições externas)

```bash
git checkout -b feat/minha-melhoria

# ... alterações ...

npm run lint
npm test
npm run build

git commit -m "feat: descreve a melhoria"
git push origin feat/minha-melhoria
```

Abra um Pull Request para `main` explicando:

- o que mudou;
- por que a mudança é necessária;
- como testar;
- impactos de compatibilidade ou migrations, quando existirem.

## Fluxo do mantenedor e agentes autorizados

A branch canônica é `main`. O repositório pode exigir Pull Request e checks de CI antes do merge — nesse caso, use **no máximo uma branch temporária por entrega** (não abra branch por arquivo ou micro-fix).

Fluxo preferido quando houver permissão de merge automático:

1. alterar e validar localmente (`lint`, `test`, `build`);
2. commit em branch única;
3. push e abertura de PR para `main`;
4. acompanhar checks e fazer merge quando verde;
5. excluir a branch temporária e sincronizar com `main`.

Não crie Issues, Releases ou Tags automaticamente para tarefas rotineiras. Não use force push nem reescreva histórico publicado sem necessidade real.

Se a proteção da `main` permitir push direto do mantenedor (sem exigir PR), o fluxo pode ser simplificado para commit direto em `main` após os mesmos checks locais.

Mudanças nativas também devem executar `npm run cap:sync`; no Android, valide ao menos `gradlew assembleDebug` quando aplicável.

## Termos da contribuição

Ao enviar intencionalmente código, documentação, testes, assets ou qualquer outra contribuição ao repositório oficial, você declara que tem direito de enviar esse material e concorda com a seção **Contributions** do [LICENSE](./LICENSE).

Em resumo, você continua sendo autor do que criou, mas concede ao mantenedor do Evolyn uma licença ampla, permanente e irrevogável para incorporar, modificar, distribuir, comercializar e relicenciar sua contribuição como parte do Evolyn.

Não envie código de terceiros sem licença compatível ou sem autorização.

## Commits

Prefira mensagens objetivas seguindo o padrão do projeto:

- `feat: adiciona filtro na biblioteca`
- `fix: corrige XP diário após reset`
- `docs: atualiza guia do usuário`
- `refactor: simplifica fluxo de atividades`

## Reportar bugs

Use o template de **Bug report** e inclua:

- comportamento esperado;
- comportamento observado;
- passos para reproduzir;
- navegador/dispositivo, quando relevante.

Não publique vulnerabilidades, tokens, credenciais ou dados pessoais em issues públicas. Para segurança, siga [SECURITY.md](./SECURITY.md).

## Pull Requests

Todo Pull Request deve confirmar que:

- os checks relevantes foram executados;
- nenhuma credencial foi incluída;
- o autor leu e aceita os termos de contribuição;
- o conteúdo enviado é próprio ou está legalmente autorizado.

O mantenedor pode aceitar, solicitar alterações ou recusar uma contribuição a seu critério.

Obrigado por ajudar a melhorar o Evolyn. 🌱
