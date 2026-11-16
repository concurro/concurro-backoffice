/** Exercise how the compact funding widget reads a sponsorship projection. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const source = [await read('../src/lib/credentials.ts'), await read('../src/lib/funding.ts')].join('\n').replace(/^import .*;$/gm, '');
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText;
const output = new URL('../.svelte-kit/funding-state-test.mjs', import.meta.url);
await mkdir(new URL('../.svelte-kit/', import.meta.url), { recursive: true });
await writeFile(output, javascript);
const { providerFunding } = await import(output.href);

const ME = '7';
const base = (overrides = {}) => ({ status: 'confirmed', provider_funding: { openai: 'org', anthropic: 'org' }, slots: {}, ...overrides });
const listing = (entries) => ({ providers: [{ provider: 'openai', label: 'OpenAI', revision: 1, entries }], types: [], roles: [] });

test('payer follows funding and sponsor', () => {
	assert.equal(providerFunding(base(), 'openai', ME).payer, 'org');
	const personal = (sponsor) => base({ provider_funding: { openai: 'contributed' }, slots: { openai: { sponsor_id: sponsor, login: 'maria' } } });
	assert.equal(providerFunding(personal(ME), 'openai', ME).payer, 'me');
	assert.equal(providerFunding(personal('9'), 'openai', ME).payer, 'other');
	assert.equal(providerFunding(personal(null), 'openai', ME).payer, 'none');
	assert.equal(providerFunding(personal(null), 'openai', ME).alert.kind, 'warning');
});

test('own scope shows the viewer’s consent without claiming a payer', () => {
	const row = providerFunding({ scope: 'own', status: 'confirmed', slots: { openai: { sponsor_id: ME } } }, 'openai', ME);
	assert.equal(row.payer, undefined);
	assert.equal(row.mine, true);
	assert.equal(row.pending, false);
});

test('a pending choice marks its intended payer', () => {
	const row = providerFunding(base({ source_provider_funding: { openai: 'contributed' }, source_slots: { openai: { sponsor_id: ME } } }), 'openai', ME);
	assert.equal(row.payer, 'org');
	assert.equal(row.pending, true);
	assert.equal(row.intended, 'me');
	const withdrawal = providerFunding(base({ provider_funding: { openai: 'contributed' }, slots: { openai: { sponsor_id: ME } }, source_slots: { openai: { sponsor_id: null } } }), 'openai', ME);
	assert.equal(withdrawal.payer, 'me');
	assert.equal(withdrawal.intended, 'none');
});

test('unusable explains the viewer’s own gap', () => {
	assert.equal(providerFunding(base(), 'openai', ME).unusable, undefined, 'unknown listing stays quiet');
	assert.match(providerFunding(base(), 'openai', ME, listing([])).unusable, /no OpenAI credential/);
	assert.match(providerFunding(base(), 'openai', ME, listing([{ enabled: false, status: 'valid' }])).unusable, /turned off or need a new token/);
	const entry = (policy) => ({ enabled: true, status: 'valid', roles: [], profiles: [], ...policy });
	assert.equal(providerFunding(base(), 'openai', ME, listing([entry()])).unusable, undefined);
	const routes = { coverage: { openai: [{ role: 'implementer', profile: 'high', model: 'gpt-5', status: 'unassigned' }] } };
	const target = 'acme/app';
	assert.match(providerFunding(base(routes), 'openai', ME, listing([entry({ roles: ['triage'] })]), target).unusable, /implementer · gpt-5: none of your credentials/);
	assert.match(providerFunding(base(routes), 'openai', ME, listing([entry({ profiles: [{ target: 'acme/other', profile: 'high' }] })]), target).unusable, /none of your credentials/);
	assert.equal(providerFunding(base(routes), 'openai', ME, listing([entry({ roles: ['implementer'], profiles: [{ target, profile: 'high' }] })]), target).unusable, undefined);
	const sponsored = base({
		provider_funding: { openai: 'contributed' },
		slots: { openai: { sponsor_id: ME } },
		coverage: { openai: [{ role: 'implementer', model: 'gpt-5', status: 'missing' }, { role: 'triage', model: 'gpt-5-mini', status: 'available' }] }
	});
	assert.equal(providerFunding(sponsored, 'openai', ME, listing([entry()])).unusable, 'implementer · gpt-5: no matching enabled credential');
});

test('a pause is attributed to the paused provider', () => {
	const paused = (recovery) => base({ provider_funding: { openai: 'contributed', anthropic: 'org' }, slots: { openai: { sponsor_id: ME } }, task_stage: 'awaiting_credentials', recovery });
	const failed = paused({ eligible: true, requirement: { provider: 'openai' }, failures: [{}] });
	assert.equal(providerFunding(failed, 'openai', ME).alert.text, 'Paused · every matching credential failed.');
	assert.equal(providerFunding(failed, 'anthropic', ME).alert, undefined);
	const cooling = providerFunding(paused({ eligible: true, requirement: { provider: 'openai' }, delivery: { id: 'd', due_at: 10, reason: 'wake' }, consumed: [] }), 'openai', ME);
	assert.deepEqual(cooling.alert, { kind: 'cooling', text: 'Cooling down, retries', due: 10 });
	assert.equal(providerFunding(paused({ eligible: false, requirement: { provider: 'openai' } }), 'openai', ME).alert.text, 'Paused · a writer must retry.');
});
