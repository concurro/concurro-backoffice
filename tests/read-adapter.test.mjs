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
const { sponsorshipFromRead, turnsFromRead, runsFromRead, targetFromRead, targetConfigurationFromRead } = await import(output.href);

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


test('run lists keep the latest attempt once and put recent work first', () => {
    const row = (id, attempt, created_at, conclusion = 'success') => ({ item_id: `${id}/${attempt}`, source_at: created_at,
        document: { id, attempt, created_at, status: 'completed', conclusion, head_branch: 'task/plan' } });
    const runs = runsFromRead([
        row(1, 2, '2026-11-20T10:00:00Z', 'failure'), row(1, 1, '2026-11-20T09:00:00Z'),
        row(2, 1, '2026-11-21T10:00:00Z'), row(1, 2, '2026-11-20T10:00:00Z', 'failure')
    ]);
    assert.deepEqual(runs.map((run) => [run.id, run.attempt]), [[2, 1], [1, 2]]);
    assert.equal(runs[1].status, 'failure');
    assert.equal(runs[1].title, 'task/plan');
});

test('target configuration presents only the supplied repository identities', () => {
    const target = targetFromRead({ upstream: 'acme/upstream', fork: 'acme/fork', issue_repository: 'acme/issues', private: 'not for display' });
    assert.deepEqual(JSON.parse(target.config), { upstream: 'acme/upstream', issue_repository: 'acme/issues', fork: 'acme/fork' });
});


test('current target configuration preserves source and models separately from identities', () => {
    const current = targetConfigurationFromRead({
        mode: 'autonomous', default_branch: 'executor',
        roster: [{ role: 'triage', agent: 'fast', profile: 'fast' }],
        profiles: [{ name: 'fast', provider: 'openai', model: 'gpt-fast', effort: 'low' }],
        settings: { max_model_calls: 48, base: 'main', limits: { changed_files: null } },
        source: { repository: 'acme/fork', branch: 'executor', sha: 'a'.repeat(40) }
    });
    assert.equal(current.mode, 'autonomous');
    assert.equal(current.defaultBranch, 'executor');
    assert.equal(current.roster[0].profile, current.profiles[0].name);
    assert.equal(current.profiles[0].model, 'gpt-fast');
    assert.equal(JSON.parse(current.config).base, 'main');
    assert.equal(current.source.sha, 'a'.repeat(40));
    const identity = targetFromRead({ upstream: 'acme/upstream', fork: 'acme/fork', issue_repository: 'acme/issues' });
    assert.equal(identity.roster.length, 0);
    assert.equal(identity.config.includes('max_model_calls'), false);
});
