# Exploração RPG AFK — arquivo independente

Este diretório preserva o jogo de Exploração que existia no Evolyn antes da criação do MyPlant. Ele foi retirado integralmente do produto principal para poder ser reaproveitado em outro sistema sem manter rotas, timers, recompensas ou dependências do RPG no app de treinos.

## O que era o jogo

A Exploração era um RPG incremental/AFK com combate automático. O jogador escolhia região e equipamento, enfrentava inimigos comuns, elites e chefes, acumulava progresso enquanto estava ausente e abria um baú de recompensas. O sistema incluía:

- mapa por regiões, capítulos, viagem e progressão por chefes;
- combate persistente, vida do herói/inimigo, tempos de ataque e estado de derrota;
- árvore de habilidades, orbes e reset de habilidades;
- patrulha e cálculo de recompensas offline;
- Bestiário com inimigos, drops e materiais de slimes;
- Loja da Vila, armas, arcos, espadas, magias e itens secretos;
- baús, Route Drink, EXP instantâneo, moedas, cosméticos e apresentações de recompensa;
- tutorial, diálogos, efeitos, sprites, cenários, mascotes e animações.

## Estrutura preservada

- `client/`: páginas, componentes React, estilos, hooks, API e todos os assets visuais/JSON do jogo.
- `server/`: rotas, serviços, regras de combate, patrulha, recompensas e testes específicos.
- `shared/`: contratos, catálogo de regiões/inimigos, combate, drops, materiais e equipamentos.
- `scripts/`: simuladores e verificadores usados no desenvolvimento do RPG.
- `docs/`: prévias visuais.
- `supabase/migrations/`: cópias das migrações históricas ligadas ao estado AFK. As migrações originais continuam no histórico do Evolyn para não quebrar bancos já migrados.
- `integration-snapshots/`: cópias dos arquivos mistos como estavam antes da extração. Eles mostram onde o RPG se conectava a usuário, inventário, loja, conquistas, API, layout e campanha.

Os caminhos internos foram mantidos próximos aos caminhos originais para facilitar uma futura restauração ou transferência.

## Fluxo técnico original

1. A página de Exploração ativava/sincronizava o estado AFK pela API `/api/meta/afk`.
2. O servidor lia `user_afk_state`, calculava o tempo elegível e avançava combate e recompensas.
3. O cliente renderizava cena, HUD, inimigo, herói, loot e transições a partir do snapshot sincronizado.
4. Recompensas pendentes eram reivindicadas e integradas a XP, moeda, inventário, cosméticos, Bestiário e equipamentos.
5. A presença e as mudanças de cena pausavam ou retomavam o relógio persistido.

## Como reutilizar em outro projeto

1. Copie `client`, `server` e `shared` preservando a resolução dos aliases usados nos imports.
2. Reaplique as migrações de `supabase/migrations` em um banco novo, revisando-as na ordem cronológica.
3. Use `integration-snapshots` como referência para reconectar providers, rotas Express, modelo de usuário, inventário e loja.
4. Copie os assets de `client/public/assets` sem alterar seus nomes antes de atualizar as referências.
5. Reinstale as dependências usadas pelo projeto de origem (React, Express, animação e renderização Lottie) e adapte autenticação/persistência ao novo sistema.
6. Rode os testes em `server/test` e os scripts de verificação antes de disponibilizar recompensas reais.

## Observações de segurança

O código é um snapshot funcional do domínio antigo, não um pacote autônomo pronto para publicação. Antes de reutilizar, revise autenticação, limites de requisição, consistência transacional das recompensas, políticas RLS e validação de payloads. Não execute as migrações copiadas em produção sem validar o schema de destino.

## Situação no Evolyn

O app principal não importa este diretório. A rota antiga redireciona para `/myplant`, cuja tela mostra “Em breve”. Dados históricos do RPG podem continuar presentes em bancos antigos, mas não são lidos nem atualizados pelo runtime atual.
