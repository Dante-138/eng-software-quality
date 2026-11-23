// O portão de commits pela linha de comando, num repositório git de verdade:
// prova que o autor de cada commit vem do git log, commit por commit.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';

const SCRIPT = resolve('tools/verificar-commits.ts');
const ROBO = 'dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>';
const ASSINATURA = 'Signed-off-by: dependabot[bot] <support@github.com>';
const MENSAGEM = `build: bump the npm group with 2 updates\n\nBumps eslint.\n\n${ASSINATURA}`;

let pasta = '';

function git(...argumentos: string[]): string {
  return execFileSync('git', argumentos, { cwd: pasta, encoding: 'utf8' }).trim();
}

function commit(mensagem: string, autor?: string): string {
  git('commit', '--quiet', '--allow-empty', '-m', mensagem, ...(autor ? [`--author=${autor}`] : []));
  return git('rev-parse', 'HEAD');
}

function rodar(base: string, ambiente: Record<string, string> = {}): { status: number | null; saida: string } {
  const r = spawnSync(process.execPath, [SCRIPT, base], {
    cwd: pasta,
    encoding: 'utf8',
    env: {
      ...process.env,
      ARQUIVO_TERMOS_PROIBIDOS: join(pasta, 'nao-existe.txt'),
      TERMOS_PROIBIDOS: '',
      EXIGIR_TERMOS_PROIBIDOS: '',
      ...ambiente,
    },
  });
  return { status: r.status, saida: r.stdout + r.stderr };
}

beforeAll(() => {
  pasta = mkdtempSync(join(tmpdir(), 'portao-'));
  git('init', '--quiet');
  git('config', 'user.name', 'Pessoa');
  git('config', 'user.email', 'pessoa@exemplo.com');
  git('config', 'commit.gpgsign', 'false');
  commit('chore: start');
});

afterAll(() => {
  rmSync(pasta, { recursive: true, force: true });
});

test('commit do robô com a assinatura dele passa', () => {
  const base = git('rev-parse', 'HEAD');
  commit(MENSAGEM, ROBO);
  expect(rodar(base).status).toBe(0);
});

test('a mesma mensagem com autor pessoa reprova', () => {
  const base = git('rev-parse', 'HEAD');
  commit(MENSAGEM);
  const resultado = rodar(base);
  expect(resultado.status).toBe(1);
  expect(resultado.saida).toContain('coautoria');
});

test('com a lista exigida, lista vazia reprova (o CI sem o secret)', () => {
  const base = git('rev-parse', 'HEAD');
  commit('docs: explain the gate');
  const resultado = rodar(base, { EXIGIR_TERMOS_PROIBIDOS: 'true' });
  expect(resultado.status).toBe(1);
  expect(resultado.saida).toContain('lista de termos proibidos vazia');
});

test('com a lista exigida e preenchida, o commit limpo passa', () => {
  const base = git('rev-parse', 'HEAD');
  commit('docs: explain the gate again');
  expect(rodar(base, { EXIGIR_TERMOS_PROIBIDOS: 'true', TERMOS_PROIBIDOS: 'Acme' }).status).toBe(0);
});
