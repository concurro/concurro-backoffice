/** Exercise the live change stream against the navigation cache, compiled as the app compiles them. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import { test } from 'node:test';
import { compileModule } from 'svelte/compiler';
import ts from 'typescript';

const directory = new URL('../.svelte-kit/events-test/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const name of ['cache.svelte', 'changes', 'events']) {
	const source = await readFile(new URL(`../src/lib/api/${name}.ts`, import.meta.url), 'utf8');
	let code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
	if (name === 'cache.svelte') code = compileModule(code, { filename: 'cache.svelte.js', generate: 'client' }).js.code;
	await writeFile(new URL(`${name}.mjs`, directory), code.replaceAll(/from '\.\/([\w.]+)\.ts'/g, "from './$1.mjs'"));
}
const { cached, clearTaskCache } = await import(new URL('cache.svelte.mjs', directory).href);
const { concerns } = await import(new URL('changes.mjs', directory).href);
const { follow } = await import(new URL('events.mjs', directory).href);

const change = (kind, fields = {}) => ({ kind, repository: 'up/project', issue: null, targets: ['up/project'], ...fields });
const KEYS = ['overview', 'target:up/project', 'target:up/other', 'runs:up/project', 'task:up/project/7', 'task:up/project/8', 'review:up/project/7', 'review:up/project/8', 'section:up/project/7:plan'];
const concerned = (event) => KEYS.filter(concerns(event));

test('a change outdates the reads that show it', () => {
	assert.deepEqual(concerned(change('tasks', { issue: 7 })), ['overview', 'task:up/project/7', 'review:up/project/7']);
	assert.deepEqual(concerned(change('issues', { issue: 7 })), ['overview', 'target:up/project']);
	assert.deepEqual(concerned(change('pulls')), ['overview', 'target:up/project']);
	assert.deepEqual(concerned(change('sponsorships', { targets: ['up/project', 'up/other'] })), ['overview', 'target:up/project', 'target:up/other']);
	assert.deepEqual(concerned(change('runs', { repository: 'owner/project' })), ['runs:up/project']);
	assert.deepEqual(concerned(change('state')), ['overview', 'target:up/project', 'runs:up/project']);
	assert.deepEqual(concerned(change('reload', { repository: null })), KEYS);
});

/** A stand-in for `EventSource` that the test opens, feeds and drops. */
class Source {
	static opened = [];
	readyState = 0;
	listeners = {};
	constructor() { Source.opened.push(this); }
	addEventListener(type, listener) { this.listeners[type] = listener; }
	emit(type, data) { this.listeners[type]({ data: typeof data === 'string' ? data : JSON.stringify(data) }); }
	close() { this.readyState = 2; }
}

test('a change missed while disconnected shows after the stream reopens', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] });
	clearTaskCache();
	Source.opened = [];
	let stage = 'plan';
	let calls = 0;
	const task = cached('task:up/project/7', async () => { calls += 1; return stage; });
	const other = cached('task:up/project/8', async () => { calls += 1; return stage; });
	task.watch();
	other.watch();
	await setImmediate();
	const stop = follow(() => new Source());
	const [first] = Source.opened;
	first.onopen();
	await setImmediate();
	assert.equal(calls, 4, 'opening the stream reloads what is displayed');
	stage = 'implement';
	first.emit('change', change('tasks', { issue: 7 }));
	first.emit('change', 'not json');
	await setImmediate();
	assert.deepEqual([task.value, other.value, calls], ['implement', 'plan', 5]);
	// The browser loses the stream; the last change happens meanwhile and no later event follows.
	first.readyState = 0;
	first.onerror();
	assert.equal(Source.opened.length, 1, 'the browser reconnects a dropped stream itself');
	stage = 'review';
	first.onopen();
	await setImmediate();
	assert.deepEqual([task.value, other.value], ['review', 'review']);
	// A stream the server refused is opened again here.
	first.readyState = 2;
	first.onerror();
	t.mock.timers.tick(5_000);
	assert.equal(Source.opened.length, 2);
	stop();
	Source.opened[1].onerror();
	t.mock.timers.tick(60_000);
	assert.deepEqual([Source.opened.length, Source.opened[1].readyState], [2, 2], 'stopped: closed and not reopened');
});
