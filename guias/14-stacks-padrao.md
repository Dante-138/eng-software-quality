# 14. Stacks padrão

## A regra

Poucas stacks, sempre as mesmas. Projeto novo escolhe uma da tabela abaixo. Stack fora da
tabela só entra depois de uma decisão do dono, escrita, com o motivo.

Por quê: cada stack a mais é um portão a mais para manter (lint, testes, CI, atualização
de dependência, imagem de container) e um contexto a mais para o agente errar. Com poucas
stacks, o que se aprende num projeto vale no próximo, e o que está nesta biblioteca serve
sem adaptação.

## As stacks

| Para                           | Stack                                          | Portão                                                                 |
| ------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------- |
| Firmware e bibliotecas em C    | C11, CMake, gcc em container fixado por digest | testes no PC com ASan e UBSan, prova do sanitizer, cppcheck, `-Werror` |
| nRF52                          | Zephyr e nRF Connect SDK, em container         | o de C, com a lógica testada no PC (`native_sim`)                      |
| ESP32                          | ESP-IDF, em container                          | o de C, com a lógica testada no PC (alvo `linux`)                      |
| Ferramentas e scripts de dados | Python                                         | pytest e ruff                                                          |
| Automação do PC (Windows)      | PowerShell                                     | Pester e PSScriptAnalyzer                                              |
| App e template web             | TypeScript, só onde já existe                  | o deste repositório (guias 3 e 4)                                      |

## O porquê de cada uma

**C11 com CMake e gcc em container.** C11 é o que os SDKs de microcontrolador usam. O
CMake é o sistema de build do Zephyr e do ESP-IDF, então o mesmo conhecimento serve nos
três. O compilador em container fixado por digest dá o mesmo binário no PC e no CI
(guia 8). Os testes rodam no PC porque é onde os sanitizers funcionam (guia 5).

**Zephyr e nRF Connect SDK para nRF52.** É o SDK oficial do fabricante para a família, e o
alvo `native_sim` roda a aplicação como processo no PC, com ASan e UBSan.

**ESP-IDF para ESP32.** É o SDK oficial do fabricante, com alvo `linux` (em prévia) para
teste de host. O teste no hardware continua necessário, como a própria documentação diz.

**Sempre em container.** SDK instalado direto no PC diverge do CI com o tempo e some
quando o PC troca. A imagem é a fonte da verdade: nada de copiar compilador ou headers
da imagem para a máquina.

**Python com pytest e ruff.** Para o que não é firmware nem interface: analisar log,
converter dado, falar com instrumento. O ruff faz lint e formatação numa ferramenta só.

**PowerShell com Pester.** Já vem no Windows e alcança o sistema sem dependência. O
Pester testa e o PSScriptAnalyzer faz o lint.

**TypeScript só onde já existe.** A stack web tem o portão mais caro de manter (navegador,
regressão visual, mutação). Fica restrita aos projetos que já a usam; projeto novo só
entra nela se for mesmo um app ou uma página.

## Como começar um projeto em cada uma

Em todos: depois do primeiro push da `main`, rodar o `tools/configurar-repo.sh` com os
nomes dos checks exigidos (guia 7), e copiar um `AGENTS.md` com as regras do repositório
(modelo em [`AGENTS-modelo.md`](https://github.com/Dante-138/eng-ai-agent-orchestration/blob/main/modelos/AGENTS-modelo.md)).

### C, nRF52 e ESP32

1. Separe a lógica do hardware desde o primeiro arquivo: módulos de lógica sem `#include`
   do SDK, hardware atrás de interface (guia 5).
2. Copie a receita [`receitas/c-sanitizers`](../receitas/c-sanitizers) para a pasta de
   testes de host: flags de aviso, sanitizers, alvos `teste`, `prova` e `analise`.
3. Copie o job de [`receita-c.yml`](../.github/workflows/receita-c.yml), ajustando a
   pasta.
4. Módulos de C já prontos e testados (frame de protocolo, e o que mais houver) ficam no repositório
   [`lib-embedded-c-ci`](https://github.com/Dante-138/lib-embedded-c-ci): copie de lá
   antes de escrever de novo.
5. O build do alvo real (Zephyr ou ESP-IDF) roda no container do SDK, no mesmo CI.

Observação: a receita daqui usa Makefile, não CMake. Serve para os testes de host de um
módulo pequeno; a regra do CMake vale para o projeto.

### Python

Esta biblioteca ainda não tem modelo pronto para Python. Até ter, o mínimo é:
`pyproject.toml` com ruff e pytest, um job de CI que roda `ruff check`, `ruff format
--check` e `pytest`, e os workflows de texto do PR e de auditoria daqui (guia 6 e 8).

### PowerShell

Esta biblioteca ainda não tem modelo pronto para PowerShell. O mínimo é: um script de
portão que rode PSScriptAnalyzer e Pester, chamado igual no PC e no CI, e o portão de
commits daqui (guia 6).

### TypeScript

Use este repositório como template ("Use this template") e siga o
[README](../README.md).

## Pedir uma stack nova

Escreva o caso antes de instalar qualquer coisa: o que a stack resolve que as da tabela
não resolvem, quanto custa manter (portão, CI, dependências) e o que seria reaproveitado.
O dono decide. Experimento rápido para embasar o pedido pode, fora da `main`.
