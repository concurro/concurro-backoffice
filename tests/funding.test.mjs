/** Exercise the actual mock command reducer using the application's Svelte compiler. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compileModule } from 'svelte/compiler';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/state/store.svelte.ts', import.meta.url), 'utf8');
const fixture = `const credentials = []; const tasks = []; const targets = []; const ME = 'mkeller'; const MOCK_ACTOR_ID = 42;`;
const javascript = ts.transpileModule(fixture + source.replace(/^import .*;$/gm, ''), { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const { js } = compileModule(javascript, { filename: 'funding.svelte.js', generate: 'client' });
const output = new URL('../.svelte-kit/funding-test.mjs', import.meta.url);
await mkdir(new URL('../.svelte-kit/', import.meta.url), { recursive: true });
await writeFile(output, js.code);
const { store, runCommand } = await import(output.href);

test('per-provider mock funding keeps consent, immutable usage and withdrawal history separate', () => {
    const issue = store.issues[0];
    const oldAnthropic = JSON.parse(JSON.stringify(issue.sponsorships.slots.anthropic));
    issue.sponsorships.calls = 7;
    issue.sponsorships.charged_calls = [{ id: 'old', kind: 'contributed', provider: 'openai', sponsor: '99', version: 1, route: 'openai-api-key', calls: 7 }];
    const charged = JSON.stringify(issue.sponsorships.charged_calls);
    runCommand(issue, 'funding', 'openai personal');
    assert.equal(issue.sponsorships.funding, 'mixed');
    assert.deepEqual(issue.sponsorships.provider_funding, { openai: 'contributed', anthropic: 'org' });
    assert.equal(issue.sponsorships.slots.openai.sponsor_id, '42');
    assert.deepEqual(issue.sponsorships.slots.anthropic, oldAnthropic);
    runCommand(issue, 'funding', 'openai org');
    assert.equal(issue.sponsorships.funding, 'org');
    assert.equal(issue.sponsorships.slots.openai.sponsor_id, '42');
    runCommand(issue, 'funding', 'openai personal');
    runCommand(issue, 'withdraw', 'openai');
    assert.equal(issue.sponsorships.provider_funding.openai, 'contributed');
    assert.equal(issue.sponsorships.slots.openai.status, 'withdrawn');
    assert.equal(issue.sponsorships.slots.openai.sponsor_id, null);
    assert.equal(issue.sponsorships.calls, 7);
    assert.equal(JSON.stringify(issue.sponsorships.charged_calls), charged);
    assert.ok(issue.sponsorships.facts.some((f) => f.actor_id === '42' && f.command === 'withdraw'));
});

test('legacy sponsorship stays prospective and cannot change a selected organization payer', () => {
    const issue = store.issues[0];
    runCommand(issue, 'funding', 'anthropic org');
    runCommand(issue, 'sponsor', 'anthropic');
    assert.equal(issue.sponsorships.provider_funding.anthropic, 'org');
    assert.equal(issue.sponsorships.slots.anthropic.sponsor_id, '42');
    assert.throws(() => runCommand(issue, 'funding', 'openai other'), /Unknown provider funding/);
});
