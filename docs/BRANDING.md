# Identidade visual do Evolyn

A marca oficial usa o símbolo de broto em verde e a assinatura “Plantando a sua evolução”. Os
arquivos consumidos pelo produto ficam versionados; pastas locais usadas apenas para receber artes
originais não fazem parte do repositório.

## Assets versionados

- `client/public/brand/`: logo completa, favicons e ícones PWA.
- `client/public/manifest.webmanifest`: metadados de instalação web e ícones maskable.
- `android/app/src/main/res/`: launcher icons adaptativos/legados e splash screens por densidade.
- `ios/App/App/Assets.xcassets/`: App Icon e splash screens do iOS.

Use o símbolo isolado em favicons, ícones de aplicativo e superfícies pequenas. Use a assinatura
completa apenas em áreas amplas, como autenticação e apresentação institucional. Não use imagens
com texto dentro de ícones de launcher.

## Regenerar os assets

Coloque as artes recebidas em uma pasta local `logos-icons/` com as variações `logo-oficial` e
`logo-completa-fundo-invisível`. Em Windows, execute:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/update-brand-assets.ps1 `
  -SourceDirectory ./logos-icons
```

Depois, valide:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run cap:sync
```

No Android, execute também `gradlew assembleDebug`. O App Icon do iOS é gerado sem canal alpha,
como exigido pela distribuição da Apple. Revise visualmente máscaras circulares, quadradas e
recortadas antes de publicar nas lojas.
