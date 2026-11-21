/** Exercise durable v2 turn and consent records through the actual adapter. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/api/read-adapter.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
	compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }
}).outputText;
const output = new URL('../.svelte-kit/read-adapter-test.mjs', import.meta.url);
await mkdir(new URL('../.svelte-kit/', import.meta.url), { recursive: true });
await writeFile(output, javascript);
const { sponsorshipFromRead, turnsFromRead } = await import(output.href);

const prompt = {
	instructions: { shared: 'Follow the plan', role: 'review' },
	repository_snapshot: { commit: 'abc123' },
	response_schema: { type: 'object' },
	untrusted_context: { issue: 'User supplied text' }
};
const detail = (records, attempts = []) => ({ records, history: { attempts } });

test('baseline turn keeps its original prompt, response and runner', async () => {
	const turn = 'baseline-turn';
	const records = [{ entity: 'turn', body: {
		turn_id: turn, operation: 'review', admitted_at: '2026-11-21T10:00:00Z',
		prompt_body_base64: Buffer.from(JSON.stringify(prompt)).toString('base64'),
		result: { outcome: 'ok', response: { answer: 'baseline result' } },
		runner_sessions: [{ session_id: 'session-a', run_id: '12345' }]
	} }];
	const [actual] = await turnsFromRead(detail(records), () => { throw new Error('baseline should not fetch an artifact'); });
	assert.match(actual.prompt.instructions, /Follow the plan/);
	assert.match(actual.prompt.snapshot, /abc123/);
	assert.match(actual.prompt.schema, /object/);
	assert.match(actual.prompt.untrusted, /User supplied text/);
	assert.match(actual.response, /baseline result/);
	assert.equal(actual.run.id, 12345);
	assert.equal(actual.outcome, 'ok');
});

test('live turn resolves prompt and response artifacts and status runner', async () => {
	const turn = 'live-turn';
	const records = [{ entity: 'turn', body: {
		turn_id: turn,
		submitted: { turn_id: turn, stage: 'review', role: 'pr_reviewer', profile: 'reviewer',
			submitted_at: '2026-11-21T10:00:00Z', prompt: { sha256: 'prompt-digest' } },
		status_snapshot: { status: 'finished', started_at: '2026-11-21T10:00:02Z',
			runner: { session_id: 'session-b', run_id: '34567/2', run_attempt: 2 } },
		finished: { outcome: 'succeeded', elapsed_seconds: 3.5, response: { sha256: 'response-digest' } }
	} }];
	const reads = [];
	const [actual] = await turnsFromRead(detail(records, [{ id: turn }]), async (id, digest) => {
		reads.push([id, digest]);
		return digest === 'prompt-digest' ? prompt : { answer: 'live result' };
	});
	assert.deepEqual(reads, [[turn, 'prompt-digest'], [turn, 'response-digest']]);
	assert.match(actual.prompt.instructions, /Follow the plan/);
	assert.match(actual.prompt.snapshot, /abc123/);
	assert.match(actual.response, /live result/);
	assert.equal(actual.run.id, 34567);
	assert.equal(actual.run.attempt, 2);
	assert.equal(actual.run.runner, 'session-b');
	assert.equal(actual.outcome, 'ok');
	assert.equal(actual.durationMs, 3500);
});

test('withdrawal remains visible with the retained provider funding state', () => {
	const view = sponsorshipFromRead([
		{ entity: 'consent_state', body: {
			slots: { openai: { status: 'withdrawn', sponsor_id: null } },
			provider_funding: { openai: 'contributed' }
		} },
		{ entity: 'consent_removal', body: { provider: 'openai', fact: { actor: { id: 42 } } } }
	]);
	assert.equal(view.slots.openai.status, 'withdrawn');
	assert.equal(view.provider_funding.openai, 'contributed');
	assert.equal(view.history[0].transition, 'withdraw');
	assert.equal(view.facts[0].command, 'withdraw');
});
