import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRouteName } from '../api/auth/[route].js';
import { individualRouteName } from '../api/individual/[route].js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

const functions = filesBelow(join(root, 'api'))
  .filter(path => path.endsWith('.js'))
  .filter(path => !relative(join(root, 'api'), path).split(sep).some(part => part.startsWith('_')));

assert.equal(authRouteName({ query: { route: 'login' } }), 'login');
assert.equal(individualRouteName({ query: { route: ['ai-drafts'] } }), 'ai-drafts');
assert.ok(functions.length <= 12, `Vercel-Hobby-Limit überschritten: ${functions.length} Serverless Functions.`);
assert.equal(functions.length, 11);

console.log('CourtHub: gebündelte API-Routen und Vercel-Hobby-Limit geprüft.');
