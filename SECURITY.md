# Política de Segurança — Evolyn

## Versão suportada

A branch `main` representa a versão atualmente suportada do projeto.

## Reportar vulnerabilidades

Não abra uma issue pública contendo:

- vulnerabilidades exploráveis;
- credenciais, tokens ou chaves;
- dados pessoais de usuários;
- detalhes que facilitem abuso antes da correção.

Prefira o recurso **Report a vulnerability** do GitHub quando ele estiver disponível no repositório. Caso não esteja, entre em contato diretamente com o mantenedor por um canal privado.

Inclua apenas o necessário para reproduzir o problema com segurança.

## Credenciais expostas

Se uma credencial real for enviada ao Git por engano, considere-a comprometida.

Remover o valor em um commit posterior **não é suficiente**, porque ele pode continuar no histórico, em forks, caches ou clones.

A ação correta é:

1. revogar/rotacionar a credencial imediatamente;
2. substituir o valor nos ambientes;
3. remover o segredo do código atual;
4. avaliar se é necessário limpar o histórico Git.

## Scripts administrativos

Scripts que alteram ou apagam dados de produção devem:

- exigir confirmação explícita;
- receber credenciais e conta administrativa por variáveis de ambiente;
- nunca conter senhas reais hardcoded;
- validar o projeto/host de destino antes de executar operações destrutivas.

## Escopo

Esta política trata do reporte responsável de falhas do Evolyn. Ela não concede autorização para acessar contas de terceiros, extrair dados, causar indisponibilidade ou realizar testes destrutivos em produção.
