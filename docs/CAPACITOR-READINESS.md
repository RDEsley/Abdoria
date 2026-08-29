# Preparação para Capacitor

Status em agosto de 2026: o frontend React/Vite pode ser empacotado com Capacitor, mas o projeto
ainda não está pronto para publicação nativa. Esta etapa é deliberadamente futura: nenhum pacote,
projeto Android/iOS ou credencial de assinatura foi adicionado agora.

## O que já está favorável

- O build gera arquivos estáticos em `client/dist` e contém `index.html`, estrutura aceita pelo
  Capacitor.
- A interface é responsiva, usa `100dvh` nas telas críticas e considera `safe-area-inset-*` na
  navegação, no player e no MyPlant.
- Dados importantes de conta, plano e progresso já vivem no servidor. O armazenamento local é
  usado principalmente para sessão e estado transitório.
- Plano, preferências, layout do Início e lembretes personalizados ficam sincronizados na conta.

## Bloqueadores antes do primeiro app nativo

1. **Separar a URL da API.** Hoje o cliente usa `/api`. Dentro do WebView isso aponta para a origem
   local do app, não para a API publicada. Criar `VITE_API_BASE_URL`, manter `/api` no web e usar a
   URL HTTPS da produção nos builds nativos. Restringir o CORS do servidor às origens oficiais.
2. **Trocar o armazenamento do token.** O JWT ainda usa `localStorage`/`sessionStorage`. No app,
   mover o token para armazenamento seguro do Keychain/Keystore. `@capacitor/preferences` serve
   para preferências leves, não deve ser tratado como cofre nem banco local.
3. **Adicionar configuração e plataformas.** Instalar `@capacitor/core`, `@capacitor/cli`,
   `@capacitor/android` e `@capacitor/ios`; criar `capacitor.config.ts` na raiz com um `appId`
   definitivo e `webDir: 'client/dist'`; depois adicionar e sincronizar as plataformas.
4. **Integrar navegação nativa.** Tratar botão Voltar do Android, retomada/pausa do app e URLs
   abertas por Universal Links/App Links. O `BrowserRouter` pode continuar, mas links externos
   precisam alimentar o React Router pelo evento `appUrlOpen`.
5. **Substituir APIs somente web.** O novo centro de lembretes usa Web Notification enquanto o app
   está aberto. Migrá-lo para `@capacitor/local-notifications`, agendar/cancelar cada alerta no
   sistema operacional e reconciliar os agendamentos quando as preferências forem alteradas.
   Testar também voz, áudio, seleção de foto, compartilhamento e downloads em aparelhos reais.

## Acabamento e publicação

- Configurar Status Bar, Splash Screen, Keyboard e orientação; validar recortes, ilha dinâmica,
  barras de gestos e teclado em iOS e Android.
- Gerar ícones e splash em todas as densidades e revisar nome, bundle ID, versão e permissões.
- Criar Privacy Manifest no iOS para APIs/plugins aplicáveis e preencher as declarações de
  privacidade das lojas.
- Testar rede lenta/offline, expiração do JWT, retomada após o sistema encerrar o processo,
  atualização de versão e migração dos valores que hoje estão em `localStorage`.
- Criar CI nativo separado: build/test sem assinatura em PR; assinatura e envio às lojas apenas em
  ambiente protegido, com certificados e segredos fora do repositório.
- Validar em aparelhos físicos. A documentação atual do Capacitor 8 informa Android API 24+ e iOS
  15+; o build iOS exige macOS/Xcode.

## Sequência recomendada

1. Introduzir a URL configurável da API e armazenamento seguro do token.
2. Criar o shell Capacitor e fazer um smoke test Android.
3. Integrar ciclo de vida, navegação, notificações e mídia.
4. Fazer testes E2E em Android e iOS reais.
5. Somente então configurar assinatura, CI/CD nativo e publicação nas lojas.

Referências oficiais: [instalação](https://capacitorjs.com/docs/getting-started),
[configuração](https://capacitorjs.com/docs/config),
[deep links](https://capacitorjs.com/docs/guides/deep-links),
[Preferences](https://capacitorjs.com/docs/apis/preferences),
[Android](https://capacitorjs.com/docs/android) e [iOS](https://capacitorjs.com/docs/ios).
