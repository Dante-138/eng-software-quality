// Portão do texto que vai para o histórico: mensagens de commit, título,
// descrição e destino do PR. Sem dependências: roda direto no Node 22.18+, que
// entende TypeScript sem etapa de build.
//
// Uso:
//   node tools/verificar-commits.ts <base>
//       Confere os commits de <base>..HEAD (por exemplo origin/main). Se <base>
//       ainda não existe (repositório novo, antes do primeiro push), confere todos.
//   node tools/verificar-commits.ts --mensagem <arquivo>
//       Confere uma mensagem só. É o modo do hook commit-msg.
//
// Variáveis de ambiente opcionais (o CI preenche):
//   TITULO_PR          título do PR. Com squash merge vira o assunto do commit na main.
//   CORPO_PR           descrição do PR. Com squash "título e descrição" vira o corpo
//                      do commit na main, então passa pelas mesmas regras de texto.
//   DESTINO_DO_PR      branch de destino do PR. Tem que ser a main.
//   TERMOS_PROIBIDOS   lista (uma por linha ou separada por vírgula) de termos que
//                      nunca podem aparecer: nome de pessoa, de empresa, de cliente.
//                      No CI vem de um secret, para a própria lista não ficar pública.
//   ARQUIVO_TERMOS_PROIBIDOS  arquivo local com a mesma lista. Padrão:
//                      ~/.config/portao-de-qualidade/termos-proibidos.txt
//   EXIGIR_TERMOS_PROIBIDOS   "true" reprova quando a lista sai vazia. O pr.yml liga:
//                      sem o secret, o portão passaria sem conferir nenhum termo.
//
// Regras:
// 1. Assunto no padrão Conventional Commits: tipo(escopo opcional): descrição
// 2. Assunto com no máximo 72 caracteres e sem ponto final
// 3. Nenhuma linha de coautoria ou de "gerado por" (única exceção: a assinatura que
//    o Dependabot põe nos commits dele, ver ASSINATURA_DO_DEPENDABOT)
// 4. Nenhum endereço de e-mail e nenhum termo da lista proibida, sem diferenciar
//    maiúscula, minúscula ou acento
// 5. PR sempre com destino na main

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const TIPOS = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
export const TAMANHO_MAXIMO = 72;
export const BRANCH_PRINCIPAL = 'main';

const ASSUNTO = new RegExp(`^(${TIPOS.join('|')})(\\([a-z0-9-]+\\))?!?: \\S.*$`);
// \u{1F916} é o emoji de robô que algumas ferramentas põem na assinatura.
const AUTORIA_DE_TERCEIRO = /^\s*(co-authored-by:|signed-off-by:|generated (with|by)\b)|\u{1F916}/imu;
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/u;
// Exceção única da regra 3: o Dependabot assina os commits dele com uma linha
// "Signed-off-by" que ele mesmo escreve. Essa linha, sozinha e inteira, é aceita só
// quando o autor do commit (lido do git) é o robô, com o nome e o e-mail noreply
// dele. Coautoria, assinatura de outra pessoa e "gerado por" reprovam também para ele.
const AUTOR_DEPENDABOT = /^dependabot\[bot\] <\d+\+dependabot\[bot\]@users\.noreply\.github\.com>$/;
const ASSINATURA_DO_DEPENDABOT = /^Signed-off-by: dependabot\[bot\] <[^<>\n]*>[ \t]*$/gm;

/** O autor ("Nome <e-mail>") é o Dependabot do GitHub? */
export function ehDependabot(autor: string): boolean {
  return AUTOR_DEPENDABOT.test(autor);
}

// Linha de corte que o git põe no editor com "commit -v": dali para baixo é diff.
const CORTE = /^# -+ >8 -+$/m;

/** Minúsculas e sem acento: "José" e "jose" são o mesmo termo. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Lê a lista de termos: um por linha ou separados por vírgula; # inicia comentário. */
export function lerTermos(texto: string): string[] {
  return texto
    .split(/[\n,]/)
    .map((linha) => (linha.split('#', 1)[0] ?? '').trim())
    .filter(Boolean);
}

function contemTermo(textoNormalizado: string, termo: string): boolean {
  const escapado = normalizar(termo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapado}($|[^\\p{L}\\p{N}])`, 'u').test(textoNormalizado);
}

/** Regras que valem para qualquer texto que vai para o histórico. */
export function problemasDoTexto(texto: string, termos: readonly string[] = []): string[] {
  const problemas: string[] = [];
  if (AUTORIA_DE_TERCEIRO.test(texto)) problemas.push('contém linha de coautoria ou de "gerado por"');
  if (EMAIL.test(texto)) problemas.push('contém endereço de e-mail');
  const normalizado = normalizar(texto);
  // O aviso diz só o número do termo: o log do CI é público e não pode repetir o termo.
  termos.forEach((termo, indice) => {
    if (contemTermo(normalizado, termo)) problemas.push(`contém o termo proibido nº ${indice + 1} da lista`);
  });
  return problemas;
}

/** Problemas de um assunto de commit (lista vazia quando está certo). */
export function problemasDoAssunto(assunto: string): string[] {
  const problemas: string[] = [];
  if (!ASSUNTO.test(assunto)) {
    problemas.push(`fora do padrão "tipo(escopo): descrição" (tipos: ${TIPOS.join(', ')})`);
  }
  if (assunto.length > TAMANHO_MAXIMO) {
    problemas.push(`tem ${assunto.length} caracteres (máximo ${TAMANHO_MAXIMO})`);
  }
  if (assunto.endsWith('.')) problemas.push('termina com ponto final');
  return problemas;
}

/**
 * Problemas da mensagem inteira (assunto + corpo). "autor" é quem fez o commit
 * ("Nome <e-mail>"); só muda o resultado quando é o Dependabot.
 */
export function problemasDaMensagem(mensagem: string, termos: readonly string[] = [], autor = ''): string[] {
  const assunto = mensagem.split('\n', 1)[0] ?? '';
  const texto = ehDependabot(autor) ? mensagem.replace(ASSINATURA_DO_DEPENDABOT, '') : mensagem;
  return [...problemasDoAssunto(assunto.trim()), ...problemasDoTexto(texto, termos)];
}

/** Mensagem como o git grava: sem o diff do "commit -v" e sem as linhas de comentário. */
export function limparMensagemDoEditor(bruta: string): string {
  const semDiff = bruta.split(CORTE, 1)[0] ?? '';
  return semDiff
    .split('\n')
    .filter((linha) => !linha.startsWith('#'))
    .join('\n')
    .trim();
}

/** Problema do destino do PR, ou null quando vai para a main. */
export function problemaDoDestino(destino: string): string | null {
  return destino === BRANCH_PRINCIPAL
    ? null
    : `o PR aponta para "${destino}"; todo PR vai direto para a ${BRANCH_PRINCIPAL} (pilha de PRs escapa da proteção)`;
}

interface Item {
  rotulo: string;
  problemas: string[];
}

function git(argumentos: string[]): string {
  return execFileSync('git', argumentos, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function existeNoGit(ref: string): boolean {
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function commitsDesde(base: string, termos: readonly string[]): Item[] {
  if (!existeNoGit('HEAD')) return []; // repositório sem nenhum commit ainda
  const intervalo = existeNoGit(base) ? `${base}..HEAD` : 'HEAD';
  // %x00 separa os commits; %x01 separa hash, autor e mensagem.
  const saida = git(['log', '--no-merges', '--format=%h%x01%an <%ae>%x01%B%x00', intervalo]);
  return saida
    .split('\0')
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .map((bloco) => {
      const [hash = '', autor = '', mensagem = ''] = bloco.split('\x01');
      return { rotulo: `commit ${hash}`, problemas: problemasDaMensagem(mensagem.trim(), termos, autor) };
    });
}

function termosConfigurados(): string[] {
  const doAmbiente = lerTermos(process.env['TERMOS_PROIBIDOS'] ?? '');
  const arquivo =
    process.env['ARQUIVO_TERMOS_PROIBIDOS'] ??
    join(homedir(), '.config', 'portao-de-qualidade', 'termos-proibidos.txt');
  const doArquivo = existsSync(arquivo) ? lerTermos(readFileSync(arquivo, 'utf8')) : [];
  const termos = [...doAmbiente, ...doArquivo];
  // No GitHub Actions, mascara cada termo no log caso algum passo o imprima.
  if (process.env['GITHUB_ACTIONS'] === 'true') for (const termo of termos) console.log(`::add-mask::${termo}`);
  return termos;
}

function itensDoPr(termos: readonly string[]): Item[] {
  const itens: Item[] = [];
  const titulo = process.env['TITULO_PR'];
  if (titulo) {
    itens.push({
      rotulo: 'título do PR',
      problemas: [...problemasDoAssunto(titulo.trim()), ...problemasDoTexto(titulo, termos)],
    });
  }
  const corpo = process.env['CORPO_PR'];
  if (corpo) itens.push({ rotulo: 'descrição do PR', problemas: problemasDoTexto(corpo, termos) });
  const destino = process.env['DESTINO_DO_PR'];
  const problemaDestino = destino ? problemaDoDestino(destino) : null;
  if (problemaDestino) itens.push({ rotulo: 'destino do PR', problemas: [problemaDestino] });
  return itens;
}

function relatar(itens: Item[]): number {
  const reprovados = itens.filter((item) => item.problemas.length > 0);
  for (const item of reprovados) {
    console.error(`REPROVADO  ${item.rotulo}`);
    for (const problema of item.problemas) console.error(`           - ${problema}`);
  }
  console.log(`${itens.length} item(ns) conferido(s), ${reprovados.length} reprovado(s).`);
  return reprovados.length > 0 ? 1 : 0;
}

function principal(argumentos: string[]): number {
  const termos = termosConfigurados();
  if (process.env['EXIGIR_TERMOS_PROIBIDOS'] === 'true' && termos.length === 0) {
    console.error('REPROVADO  lista de termos proibidos vazia');
    console.error('           - crie o secret TERMOS_PROIBIDOS em Settings > Secrets and variables,');
    console.error('             em Actions e em Dependabot (os PRs do robô só leem os secrets de Dependabot)');
    return 1;
  }
  if (argumentos[0] === '--mensagem' && argumentos[1]) {
    const mensagem = limparMensagemDoEditor(readFileSync(argumentos[1], 'utf8'));
    return relatar([{ rotulo: 'mensagem do commit', problemas: problemasDaMensagem(mensagem, termos) }]);
  }
  const base = argumentos[0];
  if (!base || base.startsWith('--')) {
    console.error('Uso: node tools/verificar-commits.ts <base> | --mensagem <arquivo>');
    return 2;
  }
  return relatar([...commitsDesde(base, termos), ...itensDoPr(termos)]);
}

// Executado direto pela linha de comando (e não importado por um teste).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = principal(process.argv.slice(2));
}
