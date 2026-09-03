# Identidade visual do Evolyn

A identidade oficial do Evolyn usa o símbolo de broto em verde e a assinatura **“Plantando a sua evolução.”**

## Fonte de verdade

Os arquivos originais e atuais da marca ficam versionados em:

```text
docs/internal/logos-icons/
```

Esse diretório funciona como **fonte de origem**, não como dependência do runtime.

O conjunto oficial é composto por `logo-oficial/`, `logo-completa-transparente/` e
`app-icon.png`. Não mantenha variantes antigas em diretórios paralelos.

Arquivos consumidos pela aplicação devem continuar nos diretórios apropriados:

- `client/public/brand/` — logo, favicons e ícones PWA;
- `client/public/manifest.webmanifest` — metadados e ícones de instalação;
- `android/app/src/main/res/` — launcher icons e splash do Android;
- `ios/App/App/Assets.xcassets/` — App Icon e splash do iOS.

Use o símbolo isolado em favicons, ícones de aplicativo e superfícies pequenas. Use a assinatura completa apenas quando houver espaço adequado.

## Atualizar os assets

No Windows, use os arquivos de `docs/internal/logos-icons/` como origem:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/update-brand-assets.ps1 `
  -SourceDirectory ./docs/internal/logos-icons
```

O script atualiza as variantes usadas pela Web, Android e iOS.

## Validação

Depois de atualizar a identidade:

```bash
npm run lint
npm test
npm run build
npm run cap:sync
```

No Android, valide também o build nativo quando o ambiente estiver disponível.

Revise visualmente:

- favicon;
- PWA/manifest;
- metadata e Open Graph;
- login/cadastro;
- ícone Android legado e adaptativo;
- splash Android;
- App Icon iOS;
- splash iOS.

Não mantenha versões antigas sem consumidor apenas por histórico. O histórico de código e assets já é preservado pelo Git.
