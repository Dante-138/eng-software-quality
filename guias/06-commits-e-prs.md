# 6. Commits e pull requests

Arquivos: [`tools/verificar-commits.ts`](../tools/verificar-commits.ts),
[`.githooks/commit-msg`](../.githooks/commit-msg), [`.githooks/pre-push`](../.githooks/pre-push),
[`.github/pull_request_template.md`](../.github/pull_request_template.md).

## Regras do portão de texto

Tudo o que vai para o histórico passa pelo mesmo portão: mensagem de commit, título,
descrição e destino do PR.

1. Assunto em Conventional Commits: `tipo(escopo opcional): descrição`, com os tipos
   `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
   `revert`. Escopo em minúsculas. `!` depois do tipo marca mudança que quebra
   compatibilidade.
2. Assunto com no máximo 72 caracteres e sem ponto final.
3. Nenhuma linha `Co-Authored-By`, `Signed-off-by` ou "Generated with/by", nem o emoji de
   robô que algumas ferramentas põem na assinatura. A autoria do repositório é de quem é
   dono dele.
4. Nenhum endereço de e-mail e nenhum termo da lista proibida (nome de pessoa, de empresa,
   de cliente), sem diferenciar maiúscula, minúscula ou acento.
5. O título do PR passa pelas regras 1 a 4; a descrição, pelas regras 3 e 4.
6. O PR aponta para a `main` (ver "Nunca empilhar PR").

Essas regras rodam no workflow `pr.yml` (check `Texto do PR`), que dispara também quando o
PR é editado: título ou base trocados depois do check verde são conferidos de novo. O CI
principal não roda em edição de PR, por isso o portão de texto fica num workflow à parte.

Por que Conventional Commits: o histórico vira documentação legível, e o release-please
(guia 9) monta a versão e o CHANGELOG a partir dele. `feat` sobe a versão menor, `fix` a de
correção, `!` a maior.

## A descrição do PR também vai para a main

O repositório mescla por squash com **título e descrição do PR** como mensagem
(`squash_merge_commit_message=PR_BODY` no `configurar-repo.sh`), e não com a lista de
commits do branch.

Caso real: com a opção padrão (lista de commits), um texto de commit intermediário, que
ninguém tinha revisado porque o PR foi revisado pelo diff e pela descrição, entrou na
`main`. Com a descrição do PR como mensagem, o que vai para o histórico é exatamente o
texto que passou pela revisão e pelo portão.

## Nada pessoal em texto público

Em repositório público, mensagem de commit, título, descrição e comentário de PR e issue
não levam nome de pessoa, e-mail, telefone, nome de empresa ou de cliente.

Por que é rígido: todo PR ganha uma referência `refs/pull/N/head` no repositório, e esse
espaço é só leitura. A documentação do GitHub diz que essas referências não podem ser
reescritas por quem mantém o repositório e que só o suporte do GitHub remove dado sensível
delas ([Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)).
Reescrever a `main` não apaga o que passou por um PR. O jeito barato é não publicar.

Como o portão ajuda sem expor a lista:

- **No PC:** um arquivo fora do repositório,
  `~/.config/portao-de-qualidade/termos-proibidos.txt`, um termo por linha (`#` comenta).
  O hook `commit-msg` reprova o commit antes de ele existir.
- **No CI:** o secret `TERMOS_PROIBIDOS` do repositório, com a mesma lista. O portão
  mascara cada termo no log e o aviso diz só o número do termo ("termo proibido nº 2"),
  porque o log de repositório público é público. Sem o secret, o check reprova
  (`EXIGIR_TERMOS_PROIBIDOS` no `pr.yml`): um portão que passa sem conferir nada parece
  verde e não protege. Os PRs do Dependabot só leem os secrets de Dependabot, então a
  mesma lista vai nos dois lugares (Settings > Secrets and variables > Actions e
  Dependabot).

Exceção única, estreita: o Dependabot assina os commits dele com uma linha
`Signed-off-by: dependabot[bot] <...>`. Essa linha, sozinha e inteira, passa só quando o
autor do commit, lido do `git log`, é o robô com o nome e o e-mail noreply dele. A mesma
linha num commit de pessoa reprova, e coautoria ou "gerado por" reprovam também para ele.

O portão não acha nome que não está na lista. A lista é a primeira linha de defesa; a
segunda é a revisão (guia 12).

## Um PR pequeno por mudança

- Um assunto por PR. "Corrige o bug X e aproveita para refatorar Y" são dois PRs.
- PR pequeno é revisado de verdade, reverte limpo e mostra no CHANGELOG uma linha que faz
  sentido.
- Cada PR diz como testar (modelo em `.github/pull_request_template.md`).

## Nunca empilhar PR

PR empilhado é um PR cujo destino é o branch de outro PR, não a `main`. Parece prático
para mudanças em sequência. O problema: a proteção vale para a `main`, não para o branch
intermediário. Quando o PR de cima é mesclado no branch do de baixo, ele entra sem portão,
e depois chega à `main` misturado no outro.

Caso real: dois PRs de uma pilha foram mesclados nos branches intermediários, e o código
deles chegou à `main` sem ter passado pela proteção como PR próprio. Desde então:

- todo PR aponta direto para a `main`;
- o portão reprova PR com outro destino (`DESTINO_DO_PR` no CI);
- se uma mudança depende de outra ainda aberta, espera o merge da primeira e faz rebase.

O check vermelho é um aviso forte, não uma trava: num branch sem proteção, o GitHub ainda
deixa mesclar. A trava de verdade é a regra de quem dá o merge (guia 10).

## Atualizar o branch de um PR

Quando a `main` anda e o PR fica desatualizado, o botão "Update branch" do GitHub oferece
merge ou rebase. Se um agente também trabalha naquele branch, use **merge**. O rebase pela
web reescreve os commits do branch remoto; o agente, com a cópia antiga, empurra por cima
ou fica com um histórico que não bate mais com o remoto. O merge só acrescenta um commit, e
o squash final apaga esse commit do histórico da `main` de qualquer forma.

## O portão também roda no PC

- `commit-msg`: confere a mensagem antes de o commit existir.
- `pre-push`: roda o `npm run check`, que começa pelo portão de commits do branch inteiro
  (`npm run commits`, contra `origin/main`).

Os dois são ativados pelo `npm install` (script `prepare`, que aponta o `core.hooksPath`
para `.githooks`).

Caso real que motivou isso: um assunto de commit com 74 caracteres passou na verificação
local, que na época não conferia commits, e só reprovou no CI. Com force push bloqueado,
corrigir o assunto custou fechar os PRs e abrir de novo. Erro que o portão pega, o PC tem
que pegar antes do push.

Pular os hooks (`--no-verify`) só em emergência: o CI confere tudo de novo.

## Mensagens: como escrever

- Assunto no imperativo, em inglês, dizendo o efeito: `fix(nucleo): reject 2026-02-30`,
  não `fix: changes in date file`.
- Corpo, quando precisa, explica o porquê e o que foi descartado.
- Sem número de ticket interno no assunto de repositório público.
