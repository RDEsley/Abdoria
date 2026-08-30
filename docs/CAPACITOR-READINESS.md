# Preparação para Capacitor

Status em agosto de 2026: o frontend React/Vite já possui Capacitor 8, projetos Android/iOS e
abstrações de plataforma. O projeto ainda precisa de credenciais, hardening e validação em aparelhos
reais antes da publicação nas lojas.

## O que já está favorável

- O build gera arquivos estáticos em `client/dist` e contém `index.html`, estrutura aceita pelo
  Capacitor.
- A interface é responsiva, usa `100dvh` nas telas críticas e considera `safe-area-inset-*` na
  navegação, no player e no MyPlant.
- Dados importantes de conta, plano e progresso já vivem no servidor. O armazenamento local é
  usado principalmente para sessão e estado transitório.
- Plano, preferências e notificações pessoais ficam sincronizados na conta.
- O snapshot de treino ativo usa um adapter web e Preferences no runtime nativo, com gravações
  serializadas para impedir que um write pendente recrie uma sessão já limpa.
- Notificações pessoais recorrentes usam `@capacitor/local-notifications`; o fallback web entrega
  apenas quando a aplicação está ativa ou volta ao foco.

## Bloqueadores antes do primeiro app nativo

1. **Separar a URL da API.** Hoje o cliente usa `/api`. Dentro do WebView isso aponta para a origem
   local do app, não para a API publicada. Criar `VITE_API_BASE_URL`, manter `/api` no web e usar a
   URL HTTPS da produção nos builds nativos. Restringir o CORS do servidor às origens oficiais.
2. **Trocar o armazenamento do token.** O JWT ainda usa `localStorage`/`sessionStorage`. No app,
   mover o token para armazenamento seguro do Keychain/Keystore. `@capacitor/preferences` serve
   para preferências leves, não deve ser tratado como cofre nem banco local.
3. **Concluir a ponte de deep links.** O runtime já encaminha `appUrlOpen`, mas o React Router ainda
   precisa consumir e validar os destinos de Universal Links/App Links.
4. **Validar integrações em hardware.** Testar notificações recorrentes após reboot, canais e sons
   no Android, limites de agendamento no iOS, voz, áudio, foto e compartilhamento em aparelhos reais.
5. **Preparar segurança e distribuição.** Definir bundle IDs finais, assinatura, Privacy Manifest,
   políticas das lojas e pipeline nativo protegido.

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
2. Fazer smoke tests Android/iOS do shell já criado e concluir deep links.
3. Validar notificações, ciclo de vida e mídia em aparelhos reais.
4. Fazer testes E2E em Android e iOS reais.
5. Somente então configurar assinatura, CI/CD nativo e publicação nas lojas.

Referências oficiais: [instalação](https://capacitorjs.com/docs/getting-started),
[configuração](https://capacitorjs.com/docs/config),
[deep links](https://capacitorjs.com/docs/guides/deep-links),
[Preferences](https://capacitorjs.com/docs/apis/preferences),
[Android](https://capacitorjs.com/docs/android) e [iOS](https://capacitorjs.com/docs/ios).
