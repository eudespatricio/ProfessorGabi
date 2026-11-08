/* Valida o pacote de áudio offline: todo clipe MP3 tem Opus, todos os arquivos
   existem e são Ogg/Opus de verdade. É o que o service worker pré-cacheia. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const mp3 = JSON.parse(fs.readFileSync(path.join(APP, 'audio', 'index.json'), 'utf8'));
const opus = JSON.parse(fs.readFileSync(path.join(APP, 'audio', 'index-opus.json'), 'utf8'));

test('índice Opus cobre todos os clipes do índice MP3', () => {
  const missing = Object.keys(mp3).filter((key) => !opus[key]);
  assert.deepEqual(missing, [], `sem Opus: ${missing.slice(0, 10).join(', ')}`);
});

test('todo clipe Opus existe e é um arquivo Ogg', () => {
  const urls = [...new Set(Object.values(opus))];
  assert.ok(urls.length > 1000, `esperava mais de 1000 clipes, veio ${urls.length}`);
  const missing = [];
  const invalid = [];
  for (const url of urls) {
    const file = path.join(APP, url);
    if (!fs.existsSync(file)) { missing.push(url); continue; }
    if (fs.readFileSync(file).subarray(0, 4).toString('ascii') !== 'OggS') invalid.push(url);
  }
  assert.deepEqual(missing, [], `arquivos ausentes: ${missing.slice(0, 10).join(', ')}`);
  assert.deepEqual(invalid, [], `arquivos que não são Ogg: ${invalid.slice(0, 10).join(', ')}`);
});
