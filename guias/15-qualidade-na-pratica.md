# 15. Qualidade na prática

Passos curtos para aplicar amanhã, com a fonte de cada um. Foco em firmware C (nRF52 com
Zephyr, ESP32 com ESP-IDF), Linux embarcado e automação de bancada em Python.

Como ler: cada prática tem **fonte**, **ganho** (o que a fonte afirma, sem número
inventado) e **amanhã** (o primeiro passo). Fontes conferidas em 16/11/2026. Onde a fonte
foi só localizada e não lida a fundo, está escrito "fonte localizada".

## Parte 1: o que o desenvolvedor faz

### Revisão

**1. Mudança pequena.**
Fonte: [Google, Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html).
Ganho: revisão mais rápida e mais completa, menos defeito, reverter fica fácil. Regra de
bolso da fonte: cerca de 100 linhas é razoável, 1000 é grande demais.
Amanhã: defina um teto de linhas por PR e divida por camada.

**2. Revisão serve para entender, não só para achar bug.**
Fonte: [Bacchelli e Bird, ICSE 2013](https://www.microsoft.com/en-us/research/publication/expectations-outcomes-and-challenges-of-modern-code-review/).
Ganho: o estudo mostra que a revisão acha menos defeito do que se espera e entrega
transferência de conhecimento e soluções alternativas.
Amanhã: ponha no checklist "consigo explicar o que esta mudança faz e por quê?".

**3. Limite por sessão de revisão.**
Fonte: [SmartBear, estudo na Cisco](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)
(material de fornecedor; o estudo original não foi conferido).
Ganho alegado: revisar de 200 a 400 linhas por vez e no máximo cerca de uma hora.
Amanhã: PR de agente maior que isso volta para ser dividido.

### Teste de C no PC

**4. Separe a lógica do hardware e teste no PC.**
Fontes: [Grenning, Test-Driven Development for Embedded C](https://pragprog.com/titles/jgade/test-driven-development-for-embedded-c/);
[Memfault, Unit Testing Basics](https://interrupt.memfault.com/blog/unit-testing-basics).
Ganho: retorno em minutos, sem placa; o teste no alvo fica mínimo.
Amanhã: isole o acesso ao hardware atrás de um header e escreva o primeiro teste de um
módulo de lógica (parser, fila, máquina de estados).

**5. Ceedling para começar rápido (Unity, CMock e build juntos).**
Fonte: [Ceedling](https://github.com/ThrowTheSwitch/Ceedling).
Amanhã: `gem install ceedling`, `ceedling new projeto`, `ceedling test:all`. O mock de
`Bar.h` é gerado sozinho como `MockBar.h`.

**6. Zephyr: twister no `native_sim`.**
Fonte: [Twister](https://docs.zephyrproject.org/latest/develop/twister/index.html).
Amanhã: `west twister -p native_sim -T tests/`. `--footprint-report` gera o relatório de
tamanho.

**7. ESP-IDF: alvo `linux` e pytest-embedded.**
Fontes: [Host apps](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/host-apps.html);
[pytest-embedded](https://docs.espressif.com/projects/pytest-embedded/en/latest/).
Ressalva da própria fonte: o alvo `linux` é experimental e o resultado no PC não reflete o
chip por inteiro.
Amanhã: `idf.py --preview set-target linux && idf.py build` num componente de lógica.

### Sanitizers e fuzzing

**8. ASan e UBSan em todo teste de PC.**
Fontes: [native_sim](https://docs.zephyrproject.org/latest/boards/native/native_sim/doc/index.html)
para Zephyr; [ASan](https://clang.llvm.org/docs/AddressSanitizer.html) e
[UBSan](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html) (fontes localizadas).
Amanhã, Zephyr: `west build -b native_sim -- -DCONFIG_ASAN=y -DCONFIG_UBSAN=y`.
Amanhã, C puro: `-fsanitize=address,undefined -fno-omit-frame-pointer -g` (guia 5).

**9. Fuzzing em tudo que lê dado de fora.**
Fontes localizadas: [libFuzzer](https://llvm.org/docs/LibFuzzer.html),
[AFL++](https://github.com/AFLplusplus/AFLplusplus).
Amanhã: escolha um parser (pacote de rádio, payload, arquivo de configuração) e faça do
teste de PC um alvo de fuzzing.

### Análise estática e avisos

**10. Um subconjunto de regras, não a norma inteira.**
Fonte: [Zephyr coding guidelines](https://docs.zephyrproject.org/latest/contribute/coding_guidelines/index.html):
um subconjunto do MISRA C:2012 com referência cruzada ao CERT C.
Ganho: regra que o time consegue cumprir de verdade.
Amanhã: liste num arquivo as checagens que reprovam o CI e comece por cppcheck.
Ferramentas (fontes localizadas): [cppcheck](https://cppcheck.sourceforge.io/),
[clang-tidy](https://clang.llvm.org/extra/clang-tidy/),
[GCC -fanalyzer](https://gcc.gnu.org/onlinedocs/gcc/Static-Analyzer-Options.html).

**11. Flags de endurecimento do compilador.**
Fonte: [OpenSSF Compiler Options Hardening Guide](https://best.openssf.org/Compiler-Hardening-Guides/Compiler-Options-Hardening-Guide-for-C-and-C++.html).
Atenção ao escopo: o guia é para Linux em espaço de usuário. Vale inteiro para daemon em
gateway; em microcontrolador, só os avisos.
Amanhã, daemon Linux: `-O2 -Wall -Wformat=2 -Wconversion -Wimplicit-fallthrough
-Werror=format-security -D_FORTIFY_SOURCE=3 -fstack-protector-strong
-fstack-clash-protection` e, no link, `-Wl,-z,relro -Wl,-z,now -Wl,-z,noexecstack`.
Confira cada flag no toolchain do alvo (musl, por exemplo): não verificado aqui.
Amanhã, firmware: `-Wall -Wformat=2 -Wconversion -Wimplicit-fallthrough
-Werror=implicit -Werror=incompatible-pointer-types -Werror=int-conversion`.

### Commits e lotes pequenos

**12. Trabalhe em lotes pequenos.**
Fonte: [DORA, Working in small batches](https://dora.dev/capabilities/working-in-small-batches/).
Ganho: a fonte liga lote pequeno a entrega estável e avisa que IA tende a gerar PR grande,
difícil de revisar.
Amanhã: uma tarefa de agente por PR; integre na `main` todo dia.
Formato da mensagem: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
(guia 6).

### Shell em Linux embarcado

**13. ShellCheck com o shebang certo.**
Fonte: [ShellCheck](https://github.com/koalaman/shellcheck).
Ganho: com `#!/bin/sh` ele avisa o que não é portável, que é o que quebra em busybox/ash.
Amanhã: `shellcheck --severity=warning scripts/*.sh`, com a versão fixada.

**14. checkbashisms para script que roda em ash.**
Fonte: [checkbashisms](https://manpages.debian.org/checkbashisms).
Amanhã: `checkbashisms scripts/*.sh` no CI. Para formatar e testar (fontes localizadas):
[shfmt](https://github.com/mvdan/sh) e [bats-core](https://github.com/bats-core/bats-core).

### Python de bancada

**15. Lint, tipos e teste num comando só.**
Fontes localizadas: [ruff](https://docs.astral.sh/ruff/), [mypy](https://mypy.readthedocs.io/),
[pytest](https://docs.pytest.org/).
Amanhã: `ruff check . && ruff format --check . && mypy . && pytest`.
Teste com hardware no laço: [pytest-embedded](https://docs.espressif.com/projects/pytest-embedded/en/latest/)
(serial, QEMU, JTAG).

## Parte 2: trabalhando com IA

### Como pedir

**16. Dê ao agente um jeito de conferir o próprio trabalho.**
Fonte: [Claude Code, best practices](https://code.claude.com/docs/en/best-practices).
Ganho: segundo a fonte, quando o agente diz "pronto" e não está, em geral é porque não
tinha como conferir.
Amanhã: a primeira linha do arquivo de instruções é o comando que roda os testes.

**17. Arquivo de instruções curto, e regra sem exceção vira trava.**
Fontes: a mesma, e [AGENTS.md](https://agents.md/) (formato aberto, "README para agentes").
Ganho: instrução em texto é orientação, não garantia; o que não pode acontecer nunca vai
para um gancho ou para o CI.
Amanhã: `AGENTS.md` com build, teste, lint e as áreas que o agente não toca.

**18. Seja específico e divida o pedido.**
Fonte: [GitHub Copilot, best practices](https://docs.github.com/en/copilot/get-started/best-practices).
Amanhã: use o modelo de brief do guia 11; conversa nova quando o contexto poluir.

### Como revisar e testar

**19. Compile, teste e rode a análise antes de ler o diff.**
Fonte: [GitHub, Review AI-generated code](https://docs.github.com/en/copilot/tutorials/review-ai-generated-code).
Amanhã: nenhum PR de agente é lido antes do CI verde.

**20. Desconfie de teste apagado, pulado ou enfraquecido.**
Fonte: a mesma.
Amanhã: olhe primeiro o diff dos arquivos de teste. "Passou" só vale com a saída do
comando.

**21. Revisão por quem não escreveu.**
Fonte: [Claude Code, best practices](https://code.claude.com/docs/en/best-practices): a
revisão roda numa sessão nova, que não viu a conversa.
Amanhã: outra sessão recebe o diff e o pedido original, não a explicação do autor
(guias 10 e 12).

### Onde a IA erra, com evidência

**22. Código inseguro com cara de seguro.**
Fontes: [Pearce e outros, Asleep at the Keyboard?](https://arxiv.org/abs/2108.09293): em 89
cenários e 1.689 programas, cerca de 40% vulneráveis.
[Perry e outros, Stanford](https://arxiv.org/abs/2211.03622): quem usou o assistente
escreveu código menos seguro e confiou mais nele. Os dois estudos usam modelos antigos
(2021 e 2022); o que continua valendo é o padrão de confiança.
Amanhã: sanitizers, análise estática e teste de PC são o juiz, não a leitura.

**23. Pacote que não existe.**
Fonte: [Spracklen e outros, USENIX Security 2025](https://arxiv.org/abs/2406.10279): em
576 mil amostras de 16 modelos, pelo menos 5,2% de pacotes inventados nos modelos
comerciais e 21,7% nos abertos.
Amanhã: toda dependência que o agente adiciona é conferida (existe? quem mantém? desde
quando?) e fixada por versão e hash (guia 8).

**24. A sensação de velocidade engana.**
Fonte: [METR, 2025](https://arxiv.org/abs/2507.09089): 16 desenvolvedores experientes, 246
tarefas; com IA levaram 19% mais tempo, e acreditavam ter sido 20% mais rápidos.
[Atualização de 2026](https://metr.org/blog/2026-02-24-uplift-update/): resultado
diferente, e a própria METR diz que o dado novo não é confiável.
Amanhã: meça por PR mesclado e defeito encontrado, não por impressão.

**25. Mais código duplicado, menos refatoração.**
Fonte: [GitClear, 2025](https://www.gitclear.com/ai_assistant_code_quality_2025_research)
(dado de fornecedor): linhas clonadas de 8,3% para 12,3% entre 2021 e 2024; código
movido de 25% para menos de 10%.
Amanhã: no checklist de revisão, "isto já existe em outro lugar?".

**26. Texto de fora é dado, não ordem.**
Fonte: [OWASP, LLM01 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).
Ganho: a fonte lista menor privilégio, aprovação humana para ação de risco e separação
do conteúdo não confiável, e avisa que nenhuma defesa é completa.
Amanhã: agente sem segredo no ambiente e sem permissão de escrita no que não precisa.

**IA e C embarcado.** Não achei fonte sólida sobre erros específicos de IA em firmware
(comportamento indefinido, concorrência, suposição de hardware). Há trabalhos
preliminares, que não conferi. A recomendação que se sustenta sem eles é a da parte 1:
quem decide é o sanitizer, a análise estática e o teste.

## Parte 3: CI para copiar

Actions fixadas por commit (conferidas em 16/11/2026). Fixe também a imagem de container
pela versão e pelo digest, `imagem:<versão>@sha256:<digest>` (guia 8). Os exemplos
abaixo mostram `<digest>` onde ele entra; o valor sai de
`docker buildx imagetools inspect imagem:<versão>`.

### Firmware C com Zephyr

```yaml
jobs:
  testes:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    # use a versão que casa com o seu Zephyr
    container: ghcr.io/zephyrproject-rtos/ci:v0.30.0@sha256:<digest>
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: Testes no PC com sanitizers
        run: west twister -p native_sim -T tests/ -x CONFIG_ASAN=y -x CONFIG_UBSAN=y
```

Não rodei este job. Imagens: [zephyrproject-rtos/docker-image](https://github.com/zephyrproject-rtos/docker-image).
Para nRF Connect SDK existe a imagem
`ghcr.io/nrfconnect/sdk-nrf-toolchain:<versão>@sha256:<digest>`, usada como container do
job.

Um job de build rodando assim, com a imagem por digest e o workspace enxuto (`west init`
e `west update` só com os módulos do nRF52), está no `ci.yml` do
[fw-nrf52840-ble-sensor-monitor](https://github.com/Dante-138/fw-nrf52840-ble-sensor-monitor/blob/main/.github/workflows/ci.yml).
O `-x` do twister do exemplo acima não foi conferido aqui: ajuste ao seu projeto.

### Firmware C com ESP-IDF

```yaml
jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: espressif/esp-idf-ci-action@e6f5c74232b1ccd4c97ed641f1e48553853f1fd5 # v1.2.0
        with:
          esp_idf_version: release-v5.5
          target: esp32
```

Não rodei este job. Fonte: [esp-idf-ci-action](https://github.com/espressif/esp-idf-ci-action).

### Python

```yaml
jobs:
  portao:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: astral-sh/setup-uv@68559e99cc807c1eb7e9238fd43a15bba460eec2 # v10.3.3
      - run: uv sync --locked --all-extras --dev
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run mypy .
      - run: uv run pytest
```

Não rodei este job. Fonte: [uv no GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/),
que recomenda fixar também a versão do uv.

### Linux embarcado

```yaml
jobs:
  scripts:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - run: sudo apt-get update -qq && sudo apt-get install -y -qq shellcheck devscripts bats
      - run: shellcheck --severity=warning scripts/*.sh
      - run: checkbashisms scripts/*.sh
      - run: bats tests/
```

Não rodei este job. Para compilar pacote para o alvo: imagens `openwrt/sdk` com tag por
alvo e versão ([openwrt/docker](https://github.com/openwrt/docker)) e a action
[openwrt/gh-action-sdk](https://github.com/openwrt/gh-action-sdk). O C do daemon passa
pelo mesmo portão de PC da parte 1, com as flags da prática 11.

## Para estudar

- [Memfault Interrupt](https://interrupt.memfault.com/): firmware na prática, teste e CI.
- [Phil Koopman, CMU](https://users.ece.cmu.edu/~koopman/): livro "Better Embedded System
  Software" e aulas de qualidade e segurança de software embarcado.
- [Grenning, TDD for Embedded C](https://pragprog.com/titles/jgade/test-driven-development-for-embedded-c/):
  o ciclo de TDD com dublês de hardware.
- [ThrowTheSwitch](https://www.throwtheswitch.org/): Unity, CMock e Ceedling.
- [Zephyr coding guidelines](https://docs.zephyrproject.org/latest/contribute/coding_guidelines/index.html):
  modelo de subconjunto do MISRA.

## O que falta neste guia

Três temas pedidos, ainda sem fonte conferida, ficam para a próxima versão: teste com
hardware no CI sem risco para a identidade gravada no chip, portão obrigatório rápido com
merge queue e cache, e revisão de merge request de firmware com IA no GitLab.
