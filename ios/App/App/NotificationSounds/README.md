# Sons de notificação (iOS)

Os arquivos `.wav` desta pasta são copiados por `npm run gen:notification-assets`.

Para que o iOS reproduza sons personalizados, adicione esta pasta ao target **App** em Xcode:

1. Abra `ios/App/App.xcworkspace`
2. Arraste a pasta `NotificationSounds` para o grupo **App**
3. Marque **Copy items if needed** e o target **App**

Sem esse passo, o app iOS usa o som padrão do sistema.
