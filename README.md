# Engenharia de Software: Qualidade

Guia e template de portão de qualidade para projetos feitos com agentes de IA.

A premissa: quando quem decide o produto não lê o código linha a linha, a confiança tem que
vir de verificações automáticas que todo código precisa passar antes de entrar na `main`,
mais uma revisão feita por quem não escreveu o código. Este repositório reúne essas
verificações, prontas para copiar, e o porquê de cada uma.

Serve de duas formas:

- **Template:** botão "Use this template" no GitHub. O projeto novo nasce com CI, lint,
  testes, portão de commits e configurações de segurança funcionando, sobre um app de
  exemplo pequeno.
- **Guia:** a pasta [`guias/`](guias) explica cada peça, com os casos reais que motivaram
  cada regra. Vale também para projeto em outra linguagem.

## O portão em uma tabela

| Verificação                                                 | Ferramenta                                                 | Onde roda                    |
| ----------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------- |
| Mensagens de commit, título e destino do PR                 | [`tools/verificar-commits.ts`](tools/verificar-commits.ts) | PC (`pre-push`) e CI         |
| Lint sem aviso e sem exceção, com regras de camada          | ESLint + typescript-eslint                                 | PC e CI                      |
| Rotas de fuga (`test.only`, `Stryker disable`, `c8 ignore`) | [`tools/verificar-escapes.ts`](tools/verificar-escapes.ts) | PC e CI                      |
| Formatação                                                  | Prettier                                                   | PC e CI                      |
| Tipos estritos, núcleo sem DOM                              | TypeScript                                                 | PC e CI                      |
| Unidade com 100% de cobertura do núcleo                     | Vitest                                                     | PC e CI                      |
| Teste por propriedade                                       | fast-check                                                 | PC e CI                      |
| Teste de mutação com meta de 100%                           | Stryker                                                    | CI (e PC sob demanda)        |
| Navegador: fluxo, console limpo, CSP                        | Playwright                                                 | CI (e PC)                    |
| Acessibilidade                                              | axe                                                        | CI (e PC)                    |
| Regressão visual                                            | Playwright no container oficial                            | CI (e PC com Docker)         |
| Workflows                                                   | actionlint + shellcheck                                    | CI (e PC com Docker)         |
| Dependência vulnerável no PR                                | dependency review                                          | CI                           |
| Análise de segurança                                        | CodeQL                                                     | CI, toda segunda e a cada PR |
| C/C++ com ASan e UBSan                                      | [`receitas/c-sanitizers`](receitas/c-sanitizers)           | CI (e PC com Docker)         |
| Proteção da `main`                                          | [`tools/configurar-repo.sh`](tools/configurar-repo.sh)     | GitHub                       |
| Atualização de dependências                                 | Dependabot com cooldown de 7 dias                          | GitHub                       |
| Versão, CHANGELOG, tag e release                            | release-please                                             | GitHub                       |

## Guias

1. [Por que um portão de qualidade](guias/01-por-que-um-portao.md)
2. [CI no GitHub Actions](guias/02-ci-github-actions.md)
3. [Lint, tipos e camadas](guias/03-lint-tipos-e-camadas.md)
4. [Testes: unidade, propriedade, mutação, navegador, acessibilidade e visual](guias/04-testes.md)
5. [Sanitizers](guias/05-sanitizers.md)
6. [Commits e pull requests](guias/06-commits-e-prs.md)
7. [Proteção da main](guias/07-protecao-da-main.md)
8. [Segurança da cadeia de suprimentos](guias/08-seguranca-da-cadeia.md)
9. [Releases, versão e artefatos](guias/09-releases-e-versao.md)
10. [Trabalhar com agentes de IA](guias/10-agentes.md)
11. [Briefs para agentes](guias/11-briefs-para-agentes.md)
12. [Checklist de revisão](guias/12-checklist-de-revisao.md)
13. [Lições reais](guias/13-licoes.md)
14. [Stacks padrão](guias/14-stacks-padrao.md)
15. [Qualidade na prática](guias/15-qualidade-na-pratica.md)

## Começar um projeto novo com o template

1. No GitHub, **Use this template**, repositório **público** (no plano gratuito, a proteção
   da `main` e a push protection só funcionam em repositório público).
2. Clone e instale (o `npm install` também ativa o hook `pre-push`):

   ```bash
   npm install
   npx playwright install chromium
   ```

3. Troque `name` e `description` no `package.json`, o título do `index.html` e este README.
4. Ligue as proteções do repositório:

   ```bash
   bash tools/configurar-repo.sh dono/repositorio
   ```

5. Crie o secret `RELEASE_TOKEN` para a release automática ([guia 9](guias/09-releases-e-versao.md))
   e o `TERMOS_PROIBIDOS`, em Actions e em Dependabot, com os nomes que nunca podem
   aparecer; sem ele o check "Texto do PR" reprova ([guia 6](guias/06-commits-e-prs.md)).
6. Apague o que não usar: `receitas/` e `.github/workflows/receita-c.yml` se o projeto não
   tem C; `guias/` se quiser o repositório enxuto.
7. Substitua o app de exemplo (`src/`, `tests/`) pelo seu, mantendo a separação entre
   `src/nucleo` (lógica pura) e a interface.

## Comandos

```bash
npm run dev                      # servidor de desenvolvimento
npm run check                    # commits, versões, lint, formato, tipos, unidade e build (o mesmo do pre-push)
npm run test:navegador           # testes no navegador, sem a regressão visual
npm run test:navegador:docker    # testes no navegador completos, no container do CI
npm run test:mutacao             # teste de mutação do núcleo
npm run lint:actions             # confere os workflows
npm run format                   # formata o código
```

Os comandos com Docker precisam do Docker Desktop aberto.

## Estrutura

```text
.github/
  workflows/        ci.yml, codeql.yml, release.yml, receita-c.yml
  dependabot.yml    atualizações semanais com cooldown
  ISSUE_TEMPLATE/   modelos de tarefa e defeito
.githooks/          pre-push que roda o npm run check
guias/              os guias por tema
receitas/           c-sanitizers: C com ASan, UBSan e cppcheck
src/
  nucleo/           lógica pura (100% de cobertura, mutação, propriedade)
  main.ts           interface
tests/
  unidade/          Vitest + fast-check
  navegador/        Playwright + axe + regressão visual
tools/              portão de commits, rotas de fuga, configuração do repositório
```

## Requisitos

- Node.js 22.18 ou mais novo (o CI usa o 24).
- Docker Desktop para a regressão visual, o actionlint e a receita de C no PC.
- `gh` (GitHub CLI) logado para o `configurar-repo.sh`.

## Licença

[MIT](LICENSE).
