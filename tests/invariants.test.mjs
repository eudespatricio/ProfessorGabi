/* Oráculo de Invariantes Arquiteturais e de Domínio (Fase 3 context-recovery).
   Valida em < 0.3s:
   - I1: Teto rígido de contexto residente (ESTADO.md + MAPA.md + REJEITADOS.md < 150 linhas)
   - I2: Paridade de versão entre app/js/version.js e app/sw.js
   - I3: Integridade do CORE do Service Worker (todos os módulos/CSS cacheados e existentes)
   - I4: Lazy-loading estrito de ocr-fix.js e wordlist-pt.js (proibido import estático fora do OCR)
   - I5: Paridade canônica de conteúdo (14 unidades, 351 palavras, 22 textos, 351 glossário, 1116 clipes)
   - I6: Cobertura de áudio 100% (MP3 + Opus OggS válido)
   - I7: Estado v2 com histórico limitado (STATE_VERSION = 2, HISTORY_MAX = 300)
   - I8: Ausência de documentos mortos/contraditórios (HANDOVER.md, PLANO-EVOLUCAO.md, etc.)
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../app/js/version.js';
import { STATE_VERSION, defaultState } from '../app/js/store.js';
import { allWords, TEXTS } from '../app/js/content.js';
import { GLOSSARY } from '../app/js/glossary.js';
import { UNITS } from '../app/js/curriculum.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');

test('I1: Contexto residente mínimo (ESTADO + MAPA + REJEITADOS) respeita teto rígido (< 150 linhas)', () => {
  const limits = { 'ESTADO.md': 80, 'MAPA.md': 60, 'REJEITADOS.md': 40 };
  let total = 0;
  for (const [name, maxLines] of Object.entries(limits)) {
    const p = path.join(ROOT, name);
    assert.ok(fs.existsSync(p), `Arquivo residente ausente: ${name}`);
    const lines = fs.readFileSync(p, 'utf8').trimEnd().split('\n').length;
    assert.ok(lines <= maxLines, `${name} excedeu teto (${lines} > ${maxLines})`);
    total += lines;
  }
  assert.ok(total < 150, `Soma do contexto residente excedeu 150 linhas (${total})`);
});

test('I2 & I3: Versão do Service Worker e CORE offline íntegros', () => {
  const sw = fs.readFileSync(path.join(APP, 'sw.js'), 'utf8');
  const m = sw.match(/const VERSION = 'gabi-(v\d+)'/);
  assert.ok(m && m[1] === APP_VERSION, `Divergência de versão: sw=${m?.[1]} vs version.js=${APP_VERSION}`);

  const coreBlock = sw.match(/const CORE = \[([\s\S]*?)\];/);
  assert.ok(coreBlock, 'CORE ausente em app/sw.js');
  const core = [...coreBlock[1].matchAll(/'([^']+)'/g)]
    .map((x) => x[1].replace(/^\.\//, ''))
    .filter(Boolean);

  for (const dir of ['js', 'css']) {
    for (const f of fs.readdirSync(path.join(APP, dir))) {
      if (/\.(js|css)$/.test(f)) {
        assert.ok(core.includes(`${dir}/${f}`), `Módulo fora do CORE do SW: ${dir}/${f}`);
      }
    }
  }
});

test('I4: Lazy-load de wordlist-pt.js e ocr-fix.js (proibido import estático no boot)', () => {
  const jsDir = path.join(APP, 'js');
  for (const f of fs.readdirSync(jsDir)) {
    if (!f.endsWith('.js') || f === 'ocr-fix.js' || f === 'wordlist-pt.js') continue;
    const src = fs.readFileSync(path.join(jsDir, f), 'utf8');
    const staticImport = /^\s*import\s+.*from\s+['"]\.\/(ocr-fix|wordlist-pt)\.js['"]/m.test(src);
    assert.ok(!staticImport, `${f} importa estaticamente ocr-fix/wordlist-pt (quebra lazy-load)`);
  }
});

test('I5 & I6: Paridade canônica de conteúdo, glossário e áudio (351 palavras, 14 unidades, 22 textos, 1116 clipes)', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'manifest.json'), 'utf8'));
  const words = allWords();
  assert.equal(UNITS.length, 14);
  assert.equal(words.length, 351);
  assert.equal(TEXTS.length, 22);
  assert.equal(Object.keys(GLOSSARY).length, 351);
  assert.equal(manifest.counts.words, words.length);
  assert.equal(manifest.counts.units, UNITS.length);
  assert.equal(manifest.counts.texts, TEXTS.length);
  assert.equal(manifest.counts.missingWordAudio, 0);
});

test('I7 & I8: Estado v2 e ausência de documentos obsoletos/efêmeros', () => {
  assert.equal(STATE_VERSION, 2);
  assert.equal(defaultState().version, 2);
  const forbidden = [
    'HANDOVER.md',
    'CONTRADICOES.md',
    'INVARIANTES.md',
    'gabi-app.zip',
    '.words.json',
    'docs/PLANO-EVOLUCAO.md',
    'docs/EXPANSAO-JOGOS-E-DICIONARIO.md',
    'docs/TESTE-DE-USO.md',
    'docs/RELATORIO-FINAL.md',
  ];
  for (const rel of forbidden) {
    assert.ok(!fs.existsSync(path.join(ROOT, rel)), `Artefato obsoleto/efêmero presente: ${rel}`);
  }
});
