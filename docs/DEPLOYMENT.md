# CI/CD do Evolyn

## Integração contínua

Pull requests e pushes em `main` executam o workflow **CI** com Node.js 22. A ordem dos gates é:

1. `npm run lint`
2. `npm run test`
3. `npm run build`

O merge só deve ocorrer com o job `Quality gates` aprovado.

## Entrega contínua

O repositório usa a integração Git da Vercel:

- branches e pull requests geram Preview Deployments;
- `main` gera o deployment de produção;
- o build de produção executa `npm run build:vercel` conforme `vercel.json`;
- a integração do Supabase valida o histórico de migrations e executa a ação de banco associada a
  pushes na `main`.

Toda migration deve ser criada e revisada em `supabase/migrations/`, validada em transação ou banco
de preview e mesclada somente com o CI aprovado. Depois do merge, confirme que o check do Supabase
terminou com sucesso e que `supabase migration list --linked` mantém os históricos local e remoto
alinhados. Não altere manualmente o schema de produção sem registrar a migration correspondente.

## Estratégia de branches

O projeto segue GitHub Flow:

- `main` é estável e protegida;
- trabalho novo usa branches curtas como `feat/...`, `fix/...`, `docs/...` ou `chore/...`;
- toda branch volta por pull request, com CI aprovado;
- não se usa force-push em `main`;
- releases relevantes recebem tag SemVer anotada somente após validação.

## Segredos

Credenciais ficam apenas nos ambientes da Vercel, Supabase ou GitHub Actions. Nunca versionar
`.env`, `.vercel/`, service role keys, JWT secrets ou tokens de deploy.
