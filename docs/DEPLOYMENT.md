# CI/CD do Evolyn

## Integração contínua

Pull requests e pushes em `main` executam o workflow **CI** com Node.js 22. A ordem dos gates é:

1. `npm run format:check`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

O merge só deve ocorrer com o job `Quality gates` aprovado.

## Entrega contínua

O repositório usa a integração Git da Vercel:

- branches e pull requests geram Preview Deployments;
- `main` gera o deployment de produção;
- o build de produção executa `npm run build:vercel` conforme `vercel.json`;
- migrations do Supabase não são executadas automaticamente.

Essa separação evita que uma migration seja aplicada por inferência durante o deploy. Richard deve
revisar e aplicar manualmente cada arquivo novo de `supabase/migrations/` antes de depender do novo
schema em produção.

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
