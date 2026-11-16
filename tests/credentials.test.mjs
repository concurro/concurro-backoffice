/** Exercise the mock credential lists, which follow the API's revision rules. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compileModule } from 'svelte/compiler';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/mock/credentials.svelte.ts', import.meta.url), 'utf8');
const fixture = `const H = 60, D = 24 * H; const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();`;
const javascript = ts.transpileModule(fixture + source.replace(/^import .*;$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const { js } = compileModule(javascript, { filename: 'credentials.svelte.js', generate: 'client' });
const output = new URL('../.svelte-kit/credentials-test.mjs', import.meta.url);
await mkdir(new URL('../.svelte-kit/', import.meta.url), { recursive: true });
await writeFile(output, js.code);
const { listing, add, edit, replace, reorder, remove } = await import(output.href);

const openai = () => listing.providers.find((list) => list.provider === 'openai');
const names = () => openai().entries.map((entry) => entry.name);
const refused = (status) => (error) => error.status === status;

test('entries of one type are added, edited and given a new token independently', () => {
    const first = add('chatgpt_subscription', { name: 'Second account', roles: ['planner'], profiles: [] }, { secret: 'synthetic', account_id: 'synthetic' });
    assert.deepEqual(names(), ['Work API key', 'ChatGPT Plus', 'Second account']);
    assert.throws(() => add('chatgpt_subscription', { name: 'No account', roles: [], profiles: [] }, { secret: 'synthetic' }), refused(422));
    const other = openai().entries[1];
    const before = JSON.stringify(other);
    const edited = edit(first.id, first.revision, { enabled: false, name: 'Spare' });
    const replaced = replace(first.id, edited.revision, { secret: 'another', account_id: 'synthetic' });
    assert.deepEqual([replaced.name, replaced.enabled, replaced.roles, replaced.version], ['Spare', false, ['planner'], 2]);
    assert.equal(JSON.stringify(other), before);
});

test('a write at a revision that is no longer current is refused and changes nothing', () => {
    const list = openai();
    const entry = list.entries[0];
    const revision = entry.revision;
    edit(entry.id, revision, { name: 'Renamed' });
    assert.throws(() => edit(entry.id, revision, { name: 'Lost update' }), refused(409));
    assert.equal(entry.name, 'Renamed');
    const ids = list.entries.map((item) => item.id).reverse();
    const stale = list.revision;
    reorder('openai', stale, ids);
    assert.deepEqual(list.entries.map((item) => item.id), ids);
    assert.throws(() => reorder('openai', stale, ids.toReversed()), refused(409));
    assert.throws(() => reorder('openai', list.revision, ids.slice(1)), refused(409));
});

test('removal takes the entry off its list and later writes to it are gone', () => {
    const entry = openai().entries[0];
    const revision = entry.revision;
    remove(entry.id, revision);
    assert.ok(!openai().entries.some((item) => item.id === entry.id));
    assert.throws(() => edit(entry.id, revision, { enabled: true }), refused(410));
});
