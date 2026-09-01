# Documentação interna do Evolyn

Este diretório contém **memória técnica, referências de identidade e material histórico usado na manutenção do Evolyn**.

`internal` significa interno ao fluxo de desenvolvimento, **não secreto**. Tudo que estiver aqui é versionado e pode ficar visível no repositório público.

Nunca salve neste diretório:

- senhas;
- tokens;
- chaves privadas;
- credenciais do Supabase/Vercel;
- dumps com dados reais;
- dados pessoais de usuários;
- qualquer material que dependa de confidencialidade.

## Leitura para agentes

Antes de alterações relevantes, consulte:

- `AGENTS.md` — regras permanentes de trabalho;
- `docs/internal/NOTES.md` — decisões e riscos atuais;
- entradas recentes de `docs/internal/DEVLOG.md` — contexto recente útil.

O código continua sendo a fonte principal para entender a implementação atual.

## Estrutura

```text
docs/internal/
├── README.md
├── NOTES.md
├── DEVLOG.md
├── logos-icons/
└── Exploracao-rpg-afk/
```

## NOTES.md

Registra somente informações que continuam úteis para manutenção, como:

- decisões arquiteturais;
- compatibilidades importantes;
- limitações e riscos conhecidos;
- regras que não são óbvias lendo o código.

Não usar como changelog, lista de commits, histórico de prompts ou arquivo de tarefas concluídas.

## DEVLOG.md

Mantém memória recente do desenvolvimento para facilitar continuidade entre sessões e agentes.

Registre apenas acontecimentos relevantes e compacte/remova entradas que perderem utilidade.

## logos-icons/

É a **fonte de verdade dos arquivos originais da identidade visual**.

Antes de criar ou reutilizar uma logo, consulte este diretório. Ao atualizar branding, revise também os consumidores reais em:

```text
client/public/brand/
client/public/manifest.webmanifest
android/
ios/
metadata
Open Graph
favicon
splash
```

Não importe assets de `docs/internal/` diretamente no runtime. Copie ou gere as variantes apropriadas para os diretórios consumidos pela aplicação.

## Exploracao-rpg-afk/

É um snapshot histórico da experiência RPG/AFK anterior.

O conteúdo não faz parte da arquitetura atual e não deve entrar no runtime, build, lint ou testes por acidente.

Não reintroduza conceitos antigos apenas porque existe implementação pronta. Qualquer reaproveitamento futuro deve ser reavaliado para a arquitetura e identidade atuais do Evolyn.
