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
const { read, add, addRelay, edit, replace, replaceDevice, pending, relays, reorder, remove } = await import(output.href);
const currentEntry = (entries, entry) => entries.find((found) => found.id === entry.id);

const openai = () => read().providers.find((list) => list.provider === 'openai');
const names = () => openai().entries.map((entry) => entry.name);
const refused = (status) => (error) => error.status === status;

test('entries of one type are added, edited and given a new token independently', () => {
    const first = add('chatgpt_subscription', { name: 'Second account', roles: ['planner'], profiles: [] }, { secret: 'synthetic', account_id: 'synthetic' });
    assert.deepEqual(names(), ['Work API key', 'ChatGPT Plus', 'Studio Sponsor', 'Second account']);
    assert.throws(() => add('chatgpt_subscription', { name: 'No account', roles: [], profiles: [] }, { secret: 'synthetic' }), refused(422));
    const other = JSON.stringify(openai().entries[1]);
    const edited = edit(first.id, first.revision, { enabled: false, name: 'Spare' });
    const replaced = replace(first.id, edited.revision, { secret: 'another', account_id: 'synthetic' });
    assert.deepEqual([replaced.name, replaced.enabled, replaced.roles, replaced.version], ['Spare', false, ['planner'], 2]);
    assert.equal(JSON.stringify(openai().entries[1]), other);
});

test('every entry change advances its list revision, and a read is a copy later writes do not reach', () => {
    const before = openai();
    const entry = before.entries[0];
    const edited = edit(entry.id, entry.revision, { name: 'Renamed' });
    const replaced = replace(entry.id, edited.revision, { secret: 'synthetic' });
    assert.deepEqual([entry.name, entry.revision], ['Work API key', replaced.revision - 2]);
    assert.equal(openai().revision, before.revision + 2);
    // An order read before those changes is stale even though the order itself did not change.
    assert.throws(() => reorder('openai', before.revision, before.entries.map((item) => item.id)), refused(409));
});

test('a dialog opened before a concurrent edit is refused, then saves at the revision a reload gives it', () => {
    const opened = openai().entries[1];
    const draft = { name: 'My draft', roles: ['implementer'] };
    edit(opened.id, opened.revision, { enabled: false });
    assert.throws(() => edit(opened.id, opened.revision, draft), refused(409));
    // Saving the unrefreshed reference again fails the same way; the reloaded one succeeds with the draft kept.
    assert.throws(() => edit(opened.id, opened.revision, draft), refused(409));
    const reloaded = currentEntry(openai().entries, opened);
    assert.equal(reloaded.revision, opened.revision + 1);
    const saved = edit(reloaded.id, reloaded.revision, draft);
    assert.deepEqual([saved.name, saved.roles, saved.enabled], ['My draft', ['implementer'], false]);
});

test('a stale reorder is refused and removal ends later writes to the entry', () => {
    const list = openai();
    const ids = list.entries.map((item) => item.id).reverse();
    reorder('openai', list.revision, ids);
    assert.deepEqual(openai().entries.map((item) => item.id), ids);
    assert.throws(() => reorder('openai', list.revision, ids.toReversed()), refused(409));
    assert.throws(() => reorder('openai', openai().revision, ids.slice(1)), refused(409));
    const entry = openai().entries[0];
    remove(entry.id, entry.revision);
    assert.equal(currentEntry(openai().entries, entry), undefined);
    assert.throws(() => edit(entry.id, entry.revision, { enabled: true }), refused(410));
});

test('Sponsor approval adds only selected routes, with both routes in one result', () => {
    const policy = { name: 'Sponsor', roles: [], profiles: [] };
    for (const routes of [['claude-subscription'], ['chatgpt-subscription'],
        ['claude-subscription', 'chatgpt-subscription']]) {
        const before = read().providers.map((list) => list.entries.length);
        const result = addRelay('BCDF-GHJK', routes, policy);
        assert.deepEqual(Object.keys(result.entries), routes);
        assert.deepEqual(read().providers.map((list) => list.entries.length), [
            before[0] + Number(routes.includes('claude-subscription')),
            before[1] + Number(routes.includes('chatgpt-subscription')),
        ]);
        assert.ok(Object.values(result.entries).every((entry) => entry.custody === 'relay'));
    }
    assert.throws(() => addRelay('BCDF-GHJK', [], policy), refused(422));
    assert.throws(() => addRelay('BCDF-GHJK', ['claude-subscription', 'claude-subscription'], policy), refused(422));
});

test('concurrent sessions of one approval in the same second have distinct lease slots', () => {
    const studio = relays().relays.find((item) => item.relay === 'relay-mock-studio');
    assert.equal(new Set(studio.active.map((lease) => `${lease.entry}/${lease.since}`)).size, 1);
    assert.deepEqual(studio.active.map((lease) => lease.slot), [1, 2]);
});

test('a looked-up code names its exact routes, and one code replaces a paired device in place', () => {
    assert.deepEqual(pending('BCDF-GHJK').routes, ['chatgpt-subscription', 'claude-subscription']);
    assert.deepEqual(pending('BCDF-GHJC').routes, ['claude-subscription']);
    assert.throws(() => pending('BCDF'), refused(404));
    const studio = () => read().providers.flatMap((list) => list.entries).filter((entry) => entry.relay === 'relay-mock-studio');
    const before = studio();
    const positions = read().providers.map((list) => list.entries.map((entry) => entry.id));
    // A code registering only Claude cannot replace both entries; a stale revision is refused.
    assert.throws(() => replaceDevice(before.map(({ id, revision }) => ({ id, revision })), 'BCDF-GHJC'), refused(409));
    assert.throws(() => replaceDevice(before.map(({ id, revision }) => ({ id, revision: revision - 1 })), 'BCDF-GHJK'), refused(409));
    const result = replaceDevice(before.map(({ id, revision }) => ({ id, revision })), 'BCDF-GHJK');
    const after = Object.values(result.entries);
    assert.equal(new Set(after.map((entry) => entry.relay)).size, 1);
    assert.notEqual(after[0].relay, 'relay-mock-studio');
    assert.deepEqual(after.map((entry) => [entry.id, entry.name, entry.roles, entry.enabled]).toSorted(),
        before.map((entry) => [entry.id, entry.name, entry.roles, entry.enabled]).toSorted());
    assert.deepEqual(read().providers.map((list) => list.entries.map((entry) => entry.id)), positions);
    // The new device is approved, not connected: live status lists only devices with links.
    assert.ok(!relays().relays.some((item) => item.relay === after[0].relay));
    assert.ok(relays().relays.every((item) => item.relay !== 'relay-mock-studio'));
});
