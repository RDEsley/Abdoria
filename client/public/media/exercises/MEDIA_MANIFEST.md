# Mídia dos exercícios

Arquivos esperados em `client/public/media/exercises/{arquivo}.gif` — o nome
exato de cada arquivo vem do campo `media.gif` do exercício nos seeds
(`server/src/db/seeds/*.ts`), não necessariamente do slug.

Quando o GIF não está disponível, a interface exibe a inicial do exercício.
Basta soltar o arquivo com o nome certo nesta pasta — sem nenhuma mudança de
código — que ele passa a aparecer sozinho.

## Pendentes (18 arquivos — 18 exercícios sem gif nenhum ainda)

| Arquivo a criar | Exercício(s) |
| --- | --- |
| `bird-dog.gif` | Bird Dog |
| `bodyweight-squat.gif` | Bodyweight Squat |
| `calf-raise.gif` | Calf Raise |
| `chair-dips.gif` | Chair Dips |
| `glute-bridge.gif` | Glute Bridge |
| `lunge.gif` | Lunge |
| `pike-push-up.gif` | Pike Push-Up |
| `push-up-board-back-wide.gif` | Push-Up Board — Costas aberto |
| `push-up-board-chest-wide.gif` | Push-Up Board — Peito largo |
| `push-up-board-decline.gif` | Push-Up Board — Peito declinado |
| `push-up-board-diamond.gif` | Push-Up Board — Tríceps diamante |
| `push-up-board-pike.gif` | Push-Up Board — Ombros pike |
| `reverse-lunge.gif` | Reverse Lunge |
| `single-leg-glute-bridge.gif` | Single-Leg Glute Bridge |
| `squat-jump.gif` | Squat Jump |
| `sumo-squat.gif` | Sumo Squat |
| `superman.gif` | Superman |
| `wall-sit.gif` | Wall Sit |

## Usando gif emprestado de outro exercício (funciona, mas não é o ideal)

Estes têm gif — só que reaproveitado de um exercício parecido como
placeholder, até ganharem um próprio. Criar o arquivo abaixo com o nome
certo troca automaticamente, sem mexer em código:

| Arquivo a criar | Exercício | Usa hoje (placeholder) |
| --- | --- | --- |
| `chin-up.gif` | Chin-Up | `hanging-knee-raise.gif` |
| `dead-hang.gif` | Dead Hang | `hanging-knee-raise.gif` |
| `pull-up.gif` | Pull-Up | `hanging-knee-raise.gif` |
| `scapular-pull-up.gif` | Scapular Pull-Up | `hanging-knee-raise.gif` |
| `knee-push-up.gif` | Knee Push-Up | `push-up.gif` |
| `push-up-board-chest.gif` | Push-Up Board — Peito | `push-up.gif` |
| `push-up-board-triceps.gif` | Push-Up Board — Tríceps | `push-up.gif` |
| `push-up-board-shoulders.gif` | Push-Up Board — Ombros | `incline-push-up.gif` |
| `push-up-board-back.gif` | Push-Up Board — Costas | `decline-push-up.gif` |
| `ab-wheel-knees.gif` | Ab Wheel — Joelhos | `ab-wheel.gif` |
| `ab-wheel-standing.gif` | Ab Wheel — Em pé | `ab-wheel.gif` |

Atenção: pra esses 11, o nome do arquivo **não é** o slug do exercício —
é literalmente `{slug}.gif` só que hoje o campo `media.gif` do seed aponta
pro placeholder listado na coluna da direita. Adicionar o arquivo com o
nome da primeira coluna não muda nada sozinho: também é preciso atualizar
o campo `media.gif` daquele exercício em `server/src/db/seeds/*.ts` pra
apontar pro novo arquivo (aí sim passa a valer).

## Catálogo completo (61 exercícios)

| Arquivo | Exercício |
|---------|-----------|
| `crunch.gif` | Crunch |
| `reverse-crunch.gif` | Reverse Crunch |
| `bicycle-crunch.gif` | Bicycle Crunch |
| `mountain-climbers.gif` | Mountain Climbers |
| `leg-raises.gif` | Leg Raises |
| `plank.gif` | Plank |
| `heel-touches.gif` | Heel Touches |
| `dead-bug.gif` | Dead Bug |
| `hollow-hold.gif` | Hollow Hold |
| `scissor-kicks.gif` | Scissor Kicks |
| `jackknife-sit-up.gif` | Jackknife Sit-Up |
| `windshield-wipers.gif` | Windshield Wipers |
| `burpee.gif` | Burpee |
| `plank-jacks.gif` | Plank Jacks |
| `v-hold.gif` | V-Hold |
| `russian-twist.gif` | Russian Twist |
| `flutter-kicks.gif` | Flutter Kicks |
| `toe-touches.gif` | Toe Touches |
| `sit-up.gif` | Sit-Up |
| `side-plank.gif` | Side Plank |
| `bear-crawl.gif` | Bear Crawl |
| `spiderman-plank.gif` | Spiderman Plank |
| `hanging-knee-raise.gif` | Hanging Knee Raise |
| `stability-ball-crunch.gif` | Stability Ball Crunch |
| `thread-the-needle.gif` | Thread the Needle |
| `dragon-flag.gif` | Dragon Flag |
| `l-sit.gif` | L-Sit |
| `ab-wheel.gif` | Ab Wheel Rollout |
| `copenhagen-plank.gif` | Copenhagen Plank |
| `push-up.gif` | Push-Up (placeholder) |
| `incline-push-up.gif` | Incline Push-Up (placeholder) |
| `decline-push-up.gif` | Decline Push-Up (placeholder) |
| `hanging-knee-raise.gif` | Chin-Up (placeholder) |
| `hanging-knee-raise.gif` | Dead Hang (placeholder) |
| `hanging-knee-raise.gif` | Pull-Up (placeholder) |
| `hanging-knee-raise.gif` | Scapular Pull-Up (placeholder) |
| `push-up.gif` | Knee Push-Up (placeholder) |
| `push-up.gif` | Push-Up Board — Peito (placeholder) |
| `push-up.gif` | Push-Up Board — Tríceps (placeholder) |
| `incline-push-up.gif` | Push-Up Board — Ombros (placeholder) |
| `decline-push-up.gif` | Push-Up Board — Costas (placeholder) |
| `ab-wheel.gif` | Ab Wheel — Joelhos (placeholder) |
| `ab-wheel.gif` | Ab Wheel — Em pé (placeholder) |
| `push-up-board-chest-wide.gif` | Push-Up Board — Peito largo (PENDENTE) |
| `push-up-board-decline.gif` | Push-Up Board — Peito declinado (PENDENTE) |
| `push-up-board-diamond.gif` | Push-Up Board — Tríceps diamante (PENDENTE) |
| `push-up-board-pike.gif` | Push-Up Board — Ombros pike (PENDENTE) |
| `push-up-board-back-wide.gif` | Push-Up Board — Costas aberto (PENDENTE) |
| `bird-dog.gif` | Bird Dog (PENDENTE) |
| `bodyweight-squat.gif` | Bodyweight Squat (PENDENTE) |
| `calf-raise.gif` | Calf Raise (PENDENTE) |
| `chair-dips.gif` | Chair Dips (PENDENTE) |
| `glute-bridge.gif` | Glute Bridge (PENDENTE) |
| `lunge.gif` | Lunge (PENDENTE) |
| `pike-push-up.gif` | Pike Push-Up (PENDENTE) |
| `reverse-lunge.gif` | Reverse Lunge (PENDENTE) |
| `single-leg-glute-bridge.gif` | Single-Leg Glute Bridge (PENDENTE) |
| `squat-jump.gif` | Squat Jump (PENDENTE) |
| `sumo-squat.gif` | Sumo Squat (PENDENTE) |
| `superman.gif` | Superman (PENDENTE) |
| `wall-sit.gif` | Wall Sit (PENDENTE) |

URL pública: `/media/exercises/{arquivo}.gif` (ver `client/src/lib/media.ts`).
