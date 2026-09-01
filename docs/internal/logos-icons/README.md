# Originais da identidade Evolyn

Esta pasta é a fonte de verdade da marca e não é importada pelo runtime.

- `logo-oficial/`: símbolo transparente para favicon, splash e superfícies pequenas;
- `logo-completa-transparente/`: assinatura completa com o texto “Plantando a sua evolução.”;
- `app-icon.png`: composição quadrada para PWA, Android e iOS.

Para gerar as cópias consumidas pelas plataformas:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/update-brand-assets.ps1 `
  -SourceDirectory ./docs/internal/logos-icons
```

As saídas ficam em `client/public/brand/`, `android/app/src/main/res/` e
`ios/App/App/Assets.xcassets/`. Não crie versões paralelas da mesma identidade.
