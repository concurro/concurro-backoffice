/** Exercise the navigation cache with the same Svelte compiler used by the app. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { compileModule } from 'svelte/compiler';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/api/cache.svelte.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const { js } = compileModule(javascript, { filename: 'cache.svelte.js', generate: 'client' });
const output = new URL('../.svelte-kit/cache-test.mjs', import.meta.url);
await mkdir(new URL('../.svelte-kit/', import.meta.url), { recursive: true });
await writeFile(output, js.code);
const { cached, cacheEpoch, clearTaskCache } = await import(output.href);

test('concurrent navigation shares one read and reuses fresh content', async () => {
	clearTaskCache();
	let calls = 0;
	const first = cached('task', async () => ++calls);
	assert.equal(cached('task', async () => 99), first);
	await setImmediate();
	assert.equal(first.value, 1);
	assert.equal(first.loading, false);
	assert.equal(cached('task', async () => 99).value, 1);
	assert.equal(calls, 1);
});

test('stale navigation keeps content visible and coalesces background refreshes', async (t) => {
	clearTaskCache();
	let now = 100_000;
	t.mock.method(Date, 'now', () => now);
	let calls = 0;
	let complete;
	const resource = cached('task', () => ++calls === 1 ? Promise.resolve('old') : new Promise((resolve) => { complete = resolve; }));
	await setImmediate();
	now += 10_001;
	assert.equal(cached('task', async () => 'wrong'), resource);
	assert.equal(cached('task', async () => 'wrong'), resource);
	await setImmediate();
	assert.equal(resource.value, 'old');
	assert.equal(resource.loading, true);
	assert.equal(calls, 2);
	complete('new');
	await setImmediate();
	assert.equal(resource.value, 'new');
	assert.equal(resource.loading, false);
});

test('refresh failure retains content and explicit retry can recover', async () => {
	clearTaskCache();
	let fail = false;
	const resource = cached('phase', async () => {
		if (fail) throw new Error('unavailable');
		return 'evidence';
	});
	await setImmediate();
	fail = true;
	resource.refresh();
	await setImmediate();
	assert.equal(resource.value, 'evidence');
	assert.equal(resource.error.message, 'unavailable');
	assert.equal(resource.loading, false);
	fail = false;
	resource.refresh();
	await setImmediate();
	assert.equal(resource.error, undefined);
	assert.equal(resource.value, 'evidence');
});

test('invalidation isolates late responses from the next task or account read', async () => {
	clearTaskCache();
	let complete;
	const previous = cached('task', () => new Promise((resolve) => { complete = resolve; }));
	await setImmediate();
	clearTaskCache();
	const current = cached('task', async () => 'current');
	await setImmediate();
	complete('previous');
	await setImmediate();
	assert.notEqual(previous, current);
	assert.equal(previous.value, 'previous');
	assert.equal(cached('task', async () => 'wrong').value, 'current');
});

test('refresh reports whether a request was scheduled so reconciliation can retry after a pending read', async () => {
	clearTaskCache();
	let complete;
	const resource = cached('summary', () => new Promise((resolve) => { complete = resolve; }));
	assert.equal(resource.refresh(), false);
	await setImmediate();
	complete('old revision');
	await setImmediate();
	assert.equal(resource.refresh(), true);
	assert.equal(resource.refresh(), false);
	await setImmediate();
	complete('new revision');
	await setImmediate();
	assert.equal(resource.value, 'new revision');
});

test('new revisions replace a section slot and isolate late obsolete responses', async () => {
	clearTaskCache();
	let complete;
	const previous = cached('section:task:plan', () => new Promise((resolve) => { complete = resolve; }), 'r1');
	const other = cached('section:other:plan', async () => 'other task', 'r1');
	await setImmediate();
	const current = cached('section:task:plan', async () => 'current plan', 'r2');
	await setImmediate();
	complete('obsolete plan');
	await setImmediate();
	assert.notEqual(current, previous);
	assert.equal(cached('section:task:plan', async () => 'wrong', 'r2'), current);
	assert.equal(current.value, 'current plan');
	assert.equal(cached('section:other:plan', async () => 'wrong', 'r1'), other);
});

test('a cache clear tells reads begun before it that their result is obsolete', () => {
	const before = cacheEpoch();
	clearTaskCache();
	assert.notEqual(cacheEpoch(), before);
});
