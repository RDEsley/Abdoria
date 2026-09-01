# Documentação interna do Evolyn

Esta pasta contém **referências técnicas, assets oficiais e material histórico utilizado durante a manutenção do Evolyn**.

Apesar do nome `private`, este diretório faz parte do repositório e deve ser considerado pelos agentes durante o desenvolvimento.

Ele não deve ser tratado como uma pasta descartável, temporária ou automaticamente excluída de análises.

---

## Leitura obrigatória para agentes

Antes de alterações relevantes no projeto, consulte:

* `AGENTS.md` — regras de trabalho, Git e comportamento dos agentes.
* `docs/assets/private/NOTES.md` — decisões técnicas ativas, compatibilidades, riscos conhecidos e convenções importantes.
* este `README.md` — organização e finalidade dos conteúdos internos desta pasta.

O código continua sendo a fonte principal para entender a implementação atual, mas decisões registradas no `NOTES.md` não devem ser ignoradas.

---

## Estrutura

```text
docs/assets/private/
├── README.md
├── NOTES.md
├── DEVLOG.md
├── logos-icons/
└── Exploracao-rpg-afk/
```

A estrutura pode evoluir conforme necessário.

Evite criar arquivos internos sem propósito claro.

---

# `NOTES.md`

Contém apenas informações técnicas que continuam relevantes para manutenção do Evolyn.

Pode incluir:

* decisões arquiteturais;
* regras de compatibilidade;
* limitações importantes;
* riscos conhecidos;
* dívidas técnicas reais;
* decisões que não são óbvias apenas lendo o código.

Não utilizar `NOTES.md` como:

* changelog;
* histórico de commits;
* histórico de prompts;
* diário de desenvolvimento;
* registro de bugs já resolvidos;
* lista permanente de tarefas concluídas.

Quando uma pendência registrada deixar de existir, remova a nota correspondente.

O Git já preserva o histórico.

---

# `logos-icons/`

Esta pasta contém os **assets oficiais e atuais da identidade visual do Evolyn**.

Ela deve ser considerada a principal referência ao trabalhar com:

* logo;
* símbolo;
* favicon;
* ícone do aplicativo;
* PWA;
* Open Graph;
* splash;
* Android;
* iOS;
* documentação;
* telas que exibem a marca.

## Fonte de verdade

Quando houver múltiplas versões da identidade espalhadas pelo projeto, prefira os arquivos atuais existentes em:

```text
docs/assets/private/logos-icons/
```

Antes de criar uma nova logo ou reutilizar um asset antigo, verifique esta pasta.

---

## Atualização das logos no projeto

Durante alterações relacionadas à identidade visual, faça também uma busca no projeto por logos e ícones antigos.

Verifique principalmente:

```text
client/public/
client/src/
docs/
android/
ios/
manifest
favicon
metadata
Open Graph
splash
ícones do aplicativo
```

Quando identificar uma versão antiga que claramente deveria utilizar a identidade atual, substitua-a.

Não faça substituições cegas apenas pelo nome do arquivo.

Confirme primeiro onde o asset é utilizado e qual formato, proporção e resolução aquele local espera.

---

## Assets de runtime

`docs/assets/private/logos-icons/` funciona como **fonte de referência/origem dos assets**, não como dependência do runtime.

Evite código como:

```text
import logo from "../../../docs/assets/private/logos-icons/..."
```

ou qualquer dependência de produção diretamente desta pasta.

Quando um asset for necessário no aplicativo, coloque a versão apropriada no diretório utilizado pelo runtime, por exemplo:

```text
client/public/
```

ou no local correspondente de Android/iOS.

A aplicação deve continuar funcionando mesmo que a documentação interna não seja incluída no bundle ou deploy.

---

## Não duplicar assets desnecessariamente

Ao atualizar a identidade:

1. descubra qual arquivo é realmente consumido;
2. substitua ou gere a versão necessária;
3. preserve o nome existente quando isso evitar alterações desnecessárias no código;
4. remova versões antigas que tenham ficado sem consumidores;
5. mantenha apenas variantes que possuam finalidade real.

Evite acumular arquivos como:

```text
logo-new.png
logo-new2.png
logo-final.png
logo-final-final.png
logo-old.png
```

A pasta deve continuar organizada e representar apenas a identidade válida.

---

## Android e iOS

Alterações no ícone oficial podem exigir atualização de múltiplas resoluções geradas para as plataformas nativas.

Não substitua apenas uma imagem isolada e considere o trabalho concluído.

Quando relevante, valide:

* Android launcher icons;
* adaptive icons;
* splash;
* iOS AppIcon;
* PWA manifest;
* favicon;
* metadata da aplicação.

Use os assets desta pasta como origem para gerar essas variantes.

---

# `Exploracao-rpg-afk/`

Contém um snapshot histórico da antiga experiência RPG/AFK.

Essa implementação **não faz parte do runtime atual do Evolyn**.

O conteúdo é preservado apenas como:

* referência;
* histórico;
* possível fonte de ideias;
* consulta de implementações antigas.

Não:

* importar código dessa pasta para o projeto atual automaticamente;
* registrar componentes dela no runtime;
* incluir seus assets no bundle atual sem necessidade;
* reintroduzir conceitos antigos apenas porque existe implementação pronta;
* tratar esse diretório como arquitetura atual.

Caso alguma ideia seja reaproveitada no futuro, implemente-a considerando a arquitetura e a identidade atuais do Evolyn.

---

# Branding atual

A identidade pública deve utilizar:

```text
Evolyn
Plantando a sua evolução.
```

Conceitos atuais incluem:

```text
Treino
Atividades
MyPlant
XP
Streak
Conquistas
Folhas
Folhas douradas
Ranking
Perfil
```

Evite reintroduzir nomenclaturas antigas na interface, metadata ou documentação atual sem motivo de compatibilidade.

Identificadores internos legados podem permanecer quando alterá-los gerar risco desnecessário para banco, migrations ou contratos existentes.

---

# Manutenção desta pasta

Os agentes possuem liberdade para organizar esta pasta quando isso melhorar claramente sua função.

Podem:

* remover referências obsoletas;
* atualizar assets oficiais;
* reorganizar arquivos;
* atualizar o `NOTES.md`;
* melhorar esta documentação.

Porém, antes de remover algo, confirme que não existe dependência legítima ou valor histórico intencional.

---

# Regra final

Esta pasta existe para ajudar o projeto atual, não para acumular passado.

**`NOTES.md` guarda conhecimento técnico.**

**`logos-icons/` guarda a identidade oficial.**

**`Exploracao-rpg-afk/` guarda apenas histórico.**

Se um arquivo não cumprir mais nenhuma dessas funções, avalie removê-lo.
