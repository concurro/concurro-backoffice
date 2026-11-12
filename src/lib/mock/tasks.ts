import type {
	DesignDecision,
	DesignReviewGeneration,
	Finding,
	IntakeDecision,
	IntakeRound,
	PlanVersion,
	PrVerdict,
	ReviewRound,
	Stage,
	Task,
	TimelineEvent
} from '#lib/types.ts';
import { ago, D, H } from './time';
import { ME, targets } from './reference';

const LC = { owner: 'example-org', repo: 'ledger-core' };
const TP = { owner: 'example-org', repo: 'tidepool' };
const AC = { owner: 'sample-labs', repo: 'atlas-cli' };

let seq = 0;
const ev = (
	minutes: number,
	kind: TimelineEvent['kind'],
	actor: string,
	text: string,
	extra: Partial<TimelineEvent> = {}
): TimelineEvent => ({ id: `ev-${++seq}`, at: ago(minutes), kind, actor, text, ...extra });

const budgets = (calls: [number, number], fix: [number, number], plan: [number, number]) => ({
	modelCalls: { used: calls[0], max: calls[1] },
	fixRounds: { used: fix[0], max: fix[1] },
	planRevisions: { used: plan[0], max: plan[1] }
});

const reviewerProfiles = (t: { owner: string; repo: string }, role: 'plan_reviewer' | 'pr_reviewer') =>
	targets
		.find((x) => x.owner === t.owner && x.repo === t.repo)!
		.roster.filter((r) => r.role === role);

function designGen(
	t: { owner: string; repo: string },
	generation: number,
	planId: string,
	minutes: number,
	verdicts: [DesignDecision | 'pending', DesignDecision | 'pending'],
	objections: [string[], string[]] = [[], []],
	resolved = true
): DesignReviewGeneration {
	return {
		generation,
		planId,
		at: ago(minutes),
		reviews: reviewerProfiles(t, 'plan_reviewer').map((r, i) => ({
			agent: r.agent,
			profile: r.profile,
			verdict: verdicts[i],
			objections: objections[i].map((text, j) => ({
				id: `O-${generation}${i ? 'b' : 'a'}${j + 1}`,
				text,
				resolved
			}))
		}))
	};
}

function round(
	t: { owner: string; repo: string },
	n: number,
	headSha: string,
	minutes: number,
	verdicts: [PrVerdict | 'pending', PrVerdict | 'pending']
): ReviewRound {
	return {
		round: n,
		headSha,
		at: ago(minutes),
		votes: reviewerProfiles(t, 'pr_reviewer').map((r, i) => ({
			agent: r.agent,
			profile: r.profile,
			verdict: verdicts[i]
		}))
	};
}

const shortPlan = (id: string, version: number, minutes: number, summary: string, steps: string[], files: string[]): PlanVersion => ({
	id,
	version,
	createdAt: ago(minutes),
	summary,
	body: `## Goal\n${summary}\n\n## Approach\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n## Files\n${files.map((f) => `- \`${f}\``).join('\n')}\n\n## Test plan\n- Unit tests for the changed behaviour, including the regression from the issue.\n- Existing suite stays green.`
});

/* ---------- Hero task: example-org/ledger-core#412 ---------- */

const heroPlanV1 = `## Goal
Postings whose legs span more than one currency must carry an explicit FX rate. Today \`Posting::validate\` sums legs per currency and silently accepts unbalanced cross-currency entries.

## Approach
1. Add \`FxRate { base, quote, rate, as_of }\` in \`src/fx.rs\` and an optional \`fx: Vec<FxRate>\` on \`Posting\`.
2. In \`Posting::validate\`, group legs by currency. If more than one currency is present, require a rate for every non-functional currency; otherwise return \`ValidationError::MissingFxRate { currency }\`.
3. Convert each leg to the functional currency, truncating to the currency's minor unit, and require the converted legs to sum to zero.

## Files
- \`src/fx.rs\` (new)
- \`src/posting.rs\`
- \`src/error.rs\`
- \`tests/posting_fx.rs\` (new)

## Test plan
- Single-currency postings validate exactly as before.
- EUR/USD posting without a rate is rejected with \`MissingFxRate\`.
- EUR/USD posting with a rate balances and is accepted.

## Out of scope
- Fetching rates from a provider.
- Triangulation through a third currency.`;

const heroPlanV2 = `## Goal
Postings whose legs span more than one currency must carry an explicit FX rate. Today \`Posting::validate\` sums legs per currency and silently accepts unbalanced cross-currency entries.

## Approach
1. Add \`FxRate { base, quote, rate, as_of }\` in \`src/fx.rs\` and an optional \`fx: Vec<FxRate>\` on \`Posting\`.
2. In \`Posting::validate\`, group legs by currency. If more than one currency is present, require a rate for every non-functional currency; otherwise return \`ValidationError::MissingFxRate { currency }\`.
3. Convert each leg to the functional currency with banker's rounding at the currency's minor unit, and require the converted legs to balance within one minor unit.
4. Reject rates that are zero, negative or older than \`Config::fx_max_age\` (default 24h) with \`InvalidFxRate\` and \`StaleFxRate\`.

## Files
- \`src/fx.rs\` (new)
- \`src/posting.rs\`
- \`src/error.rs\`
- \`src/config.rs\`
- \`tests/posting_fx.rs\` (new)

## Test plan
- Single-currency postings validate exactly as before.
- EUR/USD posting without a rate is rejected with \`MissingFxRate\`.
- EUR/USD posting with a rate balances and is accepted.
- Zero, negative and stale rates are rejected.
- Rounding: 3-leg posting with a repeating decimal balances within one minor unit.

## Out of scope
- Fetching rates from a provider.
- Triangulation through a third currency.`;

const heroPlanV3 = `## Goal
Postings whose legs span more than one currency must carry an explicit FX rate. Today \`Posting::validate\` sums legs per currency and silently accepts unbalanced cross-currency entries.

## Approach
1. Add \`FxRate { base, quote, rate, as_of }\` in \`src/fx.rs\` and an optional \`fx: Vec<FxRate>\` on \`Posting\`.
2. In \`Posting::validate\`, group legs by currency. If more than one currency is present, require a rate for every non-functional currency; otherwise return \`ValidationError::MissingFxRate { currency }\`.
3. Convert each leg to the functional currency with banker's rounding at the currency's minor unit, and require the converted legs to balance within one minor unit.
4. Reject rates that are zero, negative or older than \`Config::fx_max_age\` (default 24h) with \`InvalidFxRate\` and \`StaleFxRate\`.
5. Validation applies on write only. Stored postings are never re-validated, so existing ledgers keep loading; \`Ledger::audit\` reports legacy mixed-currency postings as warnings.

## Files
- \`src/fx.rs\` (new)
- \`src/posting.rs\`
- \`src/error.rs\`
- \`src/config.rs\`
- \`src/audit.rs\`
- \`tests/posting_fx.rs\` (new)
- \`docs/postings.md\`

## Test plan
- Single-currency postings validate exactly as before.
- EUR/USD posting without a rate is rejected with \`MissingFxRate\`.
- EUR/USD posting with a rate balances and is accepted.
- Zero, negative and stale rates are rejected.
- Rounding: 3-leg posting with a repeating decimal balances within one minor unit.
- A ledger file containing a legacy mixed-currency posting loads, and \`audit\` lists it.

## Out of scope
- Fetching rates from a provider.
- Triangulation through a third currency.`;

const heroFindings: Finding[] = [
	{
		id: 'F-1',
		raisedBy: 'pr-reviewer-a',
		raisedRound: 1,
		status: 'fixed',
		severity: 'critical',
		title: 'Converted legs are compared with `==`; the one-minor-unit tolerance is missing',
		detail: 'The approved plan (step 3) requires balance within one minor unit. `sum != Decimal::ZERO` rejects valid three-leg postings with repeating decimals.',
		path: 'src/posting.rs',
		line: 142,
		thread: 'r1893301'
	},
	{
		id: 'F-2',
		raisedBy: 'pr-reviewer-a',
		raisedRound: 1,
		status: 'fixed',
		severity: 'high',
		title: '`FxRate::new` accepts a zero rate',
		detail: 'Only negative rates are rejected. A zero rate converts every leg to 0 and trivially balances.',
		path: 'src/fx.rs',
		line: 38,
		thread: 'r1893307'
	},
	{
		id: 'F-3',
		raisedBy: 'pr-reviewer-b',
		raisedRound: 1,
		status: 'fixed',
		severity: 'high',
		title: 'Staleness check reads the wall clock directly',
		detail: 'Use the existing `Clock` trait so `StaleFxRate` tests are deterministic and do not sleep.',
		path: 'src/posting.rs',
		line: 171,
		thread: 'r1893412'
	},
	{
		id: 'F-4',
		raisedBy: 'pr-reviewer-b',
		raisedRound: 1,
		status: 'open',
		severity: 'high',
		title: 'Minor-unit lookup falls back to 2 decimals for unknown currencies',
		detail: 'JPY (0) and KWD (3) legs round incorrectly. Either extend the table from ISO 4217 or return an error for unknown codes.',
		path: 'src/fx.rs',
		line: 71,
		thread: 'r1893420'
	},
	{
		id: 'F-5',
		raisedBy: 'pr-reviewer-b',
		raisedRound: 1,
		status: 'fixed',
		severity: 'low',
		title: 'Example in docs/postings.md omits `as_of`',
		detail: 'The example would fail validation as written.',
		path: 'docs/postings.md',
		line: 88,
		thread: 'r1893431'
	},
	{
		id: 'F-6',
		raisedBy: 'pr-reviewer-b',
		raisedRound: 2,
		status: 'open',
		severity: 'high',
		title: 'Single-currency postings now allocate a `HashMap` on every validate',
		detail: 'This is the hot path for bulk import. Short-circuit when all legs share the first leg’s currency before grouping.',
		path: 'src/posting.rs',
		line: 128,
		thread: 'r1901177'
	}
];

/** One triage assessment, `minutesAgo` before now. */
const triage = (minutesAgo: number, rationale: string, concerns: string[] = [], decision: IntakeDecision = 'proceed', risk = 'medium'): IntakeRound => ({
	agent: 'triage',
	profile: 'claude-sonnet-5-5 · high',
	decision,
	risk,
	rationale,
	concerns,
	at: ago(minutesAgo)
});

const hero: Task = {
	...LC,
	issue: 412,
	title: 'Reject postings with mixed-currency legs unless an FX rate is attached',
	author: 'odalby',
	labels: ['bug', 'validation', 'concurro'],
	stage: 'review',
	atStage: 'review',
	mode: 'manual',
	sponsor: ME,
	alert: {
		tone: 'note',
		title: 'PR review round 2 is in progress',
		body: 'pr-reviewer-b requested changes on head e7b20d3. The implementer has replied to F-4 and a repair for F-6 is queued. No action is needed from you.'
	},
	body: [
		'`Posting::validate` accepts a posting whose legs use different currencies even when no FX rate is attached. The ledger then sums the legs as if they shared one currency, so the posting balances on paper but not in value.',
		'',
		'## Steps to reproduce',
		'',
		'```',
		'ledger post --leg "cash:+100 USD" --leg "revenue:-100 EUR"',
		'```',
		'',
		'## Expected',
		'',
		'- Reject the posting with `MixedCurrencyWithoutRate`.',
		'- Accept it when every foreign leg carries a rate.'
	].join('\n'),
	intake: [
		triage(
			2 * D + 6 * H - 9,
			'Actionable, well-scoped validation bug with a clear reproduction. Changes the posting API contract, so existing callers that post mixed legs will start failing.',
			['Decide how stored mixed-currency postings are treated; a retroactive check could make existing ledgers unloadable.', 'Specify the rounding rule for converted legs.']
		)
	],
	pr: {
		number: 418,
		title: 'Require an FX rate for mixed-currency postings',
		branch: 'concurro/412-mixed-currency-fx',
		headSha: 'e7b20d3',
		ci: 'passing',
		additions: 412,
		deletions: 37,
		ready: false
	},
	plans: [
		{ id: 'pl_3a91c0', version: 1, createdAt: ago(2 * D + 5 * H), summary: 'Initial plan', body: heroPlanV1 },
		{ id: 'pl_7d02be', version: 2, createdAt: ago(2 * D + 3 * H), summary: 'Rounding policy; reject zero, negative and stale rates', body: heroPlanV2 },
		{ id: 'pl_c41f9e', version: 3, createdAt: ago(2 * D + 1 * H), summary: 'Write-only validation; audit reports legacy postings', body: heroPlanV3 }
	],
	approvedPlanId: 'pl_c41f9e',
	designReview: [
		designGen(LC, 1, 'pl_3a91c0', 2 * D + 4 * H, ['revise', 'revise'], [
			[
				'Rounding policy is unspecified. Truncation lets one-minor-unit drift accumulate across legs.',
				'No handling for zero or negative rates.'
			],
			['A rate with an arbitrarily old `as_of` is accepted. Define a staleness bound.']
		]),
		designGen(LC, 2, 'pl_7d02be', 2 * D + 2 * H, ['approve', 'revise'], [
			[],
			['The plan does not say whether stored postings are re-validated. A retroactive check would make existing ledgers unloadable.']
		]),
		designGen(LC, 3, 'pl_c41f9e', 2 * D + 0.5 * H, ['approve', 'approve'])
	],
	rounds: [
		round(LC, 1, 'a41c9e7', 1 * D + 2 * H, ['changes_requested', 'changes_requested']),
		round(LC, 2, 'e7b20d3', 3 * H, ['approve', 'changes_requested'])
	],
	findings: heroFindings,
	budgets: budgets([23, 48], [1, 4], [2, 3]),
	enrolledAt: ago(2 * D + 6 * H),
	updatedAt: ago(14),
	timeline: [
		ev(2 * D + 6 * H, 'github', 'odalby', 'Opened issue and applied label `concurro`'),
		ev(2 * D + 6 * H - 2, 'command', 'mkeller', '`/concurro start`'),
		ev(2 * D + 6 * H - 3, 'command', 'mkeller', '`/concurro sponsor`: model calls are paid with mkeller’s credentials'),
		ev(2 * D + 6 * H - 9, 'turn', 'triage', 'Assessment: actionable, well-scoped bug', { turn: 1, tone: 'success' }),
		ev(2 * D + 5 * H, 'turn', 'planner', 'Published plan v1 (`pl_3a91c0`)', { turn: 2 }),
		ev(2 * D + 4 * H, 'review', 'plan-reviewer-a', 'Design review: changes requested, 2 objections', { turn: 3, tone: 'warning' }),
		ev(2 * D + 4 * H - 4, 'review', 'plan-reviewer-b', 'Design review: changes requested, 1 objection', { turn: 4, tone: 'warning' }),
		ev(2 * D + 3 * H, 'turn', 'planner', 'Published plan v2 (`pl_7d02be`)', { turn: 5 }),
		ev(2 * D + 2 * H + 20, 'system', 'concurro', 'Turn 7 expired in the queue; rescheduled', { turn: 7, tone: 'warning' }),
		ev(2 * D + 2 * H, 'review', 'plan-reviewer-b', 'Design review: changes requested, 1 objection', { turn: 8, tone: 'warning' }),
		ev(2 * D + 1 * H, 'turn', 'planner', 'Published plan v3 (`pl_c41f9e`)', { turn: 9 }),
		ev(2 * D + 0.5 * H, 'review', 'plan-reviewer-b', 'Design review: all reviewers approve plan v3', { turn: 11, tone: 'success' }),
		ev(2 * D, 'command', 'mkeller', '`/concurro approve pl_c41f9e`'),
		ev(1 * D + 8 * H, 'system', 'concurro', 'Implementation turn 12 timed out after 45m; retried automatically', { turn: 12, tone: 'danger' }),
		ev(1 * D + 6 * H, 'turn', 'implementer', 'Implementation complete: 7 files changed', { turn: 13, tone: 'success' }),
		ev(1 * D + 6 * H - 5, 'github', 'concurro', 'Opened draft pull request #418 at head `a41c9e7`'),
		ev(1 * D + 2 * H, 'review', 'pr-reviewer-b', 'PR review round 1: changes requested, 5 findings', { turn: 15, tone: 'warning' }),
		ev(8 * H, 'turn', 'implementer', 'Repair round 1 pushed head `e7b20d3` with fixes for F-1, F-2, F-3 and F-5', { turn: 17 }),
		ev(4 * H, 'review', 'pr-reviewer-a', 'PR review round 2: approve; F-1 and F-2 fixed', { turn: 18, tone: 'success' }),
		ev(3 * H, 'review', 'pr-reviewer-b', 'PR review round 2: changes requested; F-3 and F-5 fixed, F-4 still open, raised F-6', { turn: 21, tone: 'warning' }),
		ev(40, 'system', 'concurro', 'Turn 22 outcome uncertain: runner finished but no result was recorded', { turn: 22, tone: 'warning' }),
		ev(14, 'turn', 'implementer', 'Replied on F-4 thread; repair for F-6 queued', { turn: 23 })
	]
};

/* ---------- Remaining tasks ---------- */

interface Seed extends Partial<Task> {
	issue: number;
	title: string;
	stage: Stage;
	alert: Task['alert'];
}

function mk(t: { owner: string; repo: string }, s: Seed, age: number, updated: number): Task {
	const target = targets.find((x) => x.owner === t.owner && x.repo === t.repo)!;
	const max = target.repo === 'ledger-core' ? 48 : target.repo === 'tidepool' ? 40 : 32;
	return {
		...t,
		author: 'rpike',
		labels: ['concurro'],
		atStage: s.stage,
		mode: target.mode,
		body: `${s.title}.`,
		intake: ['intake', 'clarify'].includes(s.atStage ?? s.stage) ? [] : [triage(age - 3, 'Actionable and well scoped.', [], 'proceed', 'low')],
		plans: [],
		designReview: [],
		rounds: [],
		findings: [],
		budgets: budgets([1, max], [0, 4], [0, 3]),
		enrolledAt: ago(age),
		updatedAt: ago(updated),
		timeline: [
			ev(age, 'github', s.author ?? 'rpike', 'Opened issue and applied label `concurro`'),
			ev(age - 2, 'command', 'jvoss', '`/concurro start`'),
			ev(updated, 'stage', 'concurro', `Stage changed to \`${s.stage}\``)
		],
		...s
	};
}

const lc398plan = shortPlan(
	'pl_5be7d1',
	2,
	5 * H,
	'Keep idempotency keys for at least the client retry window so a late retry cannot create a duplicate posting.',
	[
		'Derive key TTL from `Config::retry_window` plus a 10% margin instead of the fixed 15 minutes.',
		'Store `expires_at` alongside each key and sweep lazily on lookup.',
		'Return `409 DuplicateRequest` with the original posting id when a live key is replayed.'
	],
	['src/idempotency.rs', 'src/config.rs', 'tests/idempotency.rs']
);

const tp73findings: Finding[] = [
	{
		id: 'F-1',
		raisedBy: 'pr-reviewer-a',
		raisedRound: 1,
		status: 'open',
		severity: 'critical',
		title: 'Shutdown waits on the ack channel after the connection pool is closed',
		detail: '`drain()` is called after `pool.close()`, so in-flight acks fail with `PoolClosed`. Reverse the order.',
		path: 'tidepool/worker.py',
		line: 214,
		thread: 'r771204'
	}
];

export const tasks: Task[] = [
	hero,
	mk(LC, {
		issue: 398,
		title: 'Idempotency keys expire before the retry window closes',
		stage: 'planned',
		author: 'tnakata',
		labels: ['bug', 'concurro'],
		sponsor: 'jvoss',
		alert: {
			tone: 'tip',
			title: 'Plan v2 is approved by all reviewers and waits for a writer',
			body: 'Review the plan, then run `/concurro approve pl_5be7d1` to start implementation.'
		},
		plans: [
			{ ...shortPlan('pl_19ac04', 1, 9 * H, 'Extend the idempotency key TTL to cover the client retry window.', ['Raise the fixed TTL from 15 minutes to 2 hours.'], ['src/idempotency.rs']), summary: 'Initial plan' },
			{ ...lc398plan, summary: 'Derive TTL from the retry window; lazy sweep' }
		],
		designReview: [
			designGen(LC, 1, 'pl_19ac04', 8 * H, ['revise', 'approve'], [['A fixed 2h TTL breaks again when `retry_window` is raised. Derive it from config.'], []]),
			designGen(LC, 2, 'pl_5be7d1', 4 * H, ['approve', 'approve'])
		],
		budgets: budgets([7, 48], [0, 4], [1, 3])
	}, 11 * H, 4 * H),
	mk(LC, {
		issue: 431,
		title: 'Balance snapshot drifts after journal compaction',
		stage: 'clarify',
		atStage: 'intake',
		author: 'odalby',
		labels: ['bug', 'needs-info', 'concurro'],
		sponsor: ME,
		intake: [triage(5 * H, 'The report does not say whether compaction ran concurrently with writes, which decides between a locking bug and a snapshot-format bug.', [], 'clarify')],
		question: 'Does the drift appear only when compaction runs concurrently with writes, or also on an idle ledger? A journal file that reproduces it would let the planner write a regression test.',
		alert: {
			tone: 'warning',
			title: 'Input needed',
			body: 'Triage asked a question on the issue. Assessment resumes when the author or a writer replies.'
		},
		budgets: budgets([2, 48], [0, 4], [0, 3])
	}, 1 * D + 3 * H, 6 * H),
	mk(LC, {
		issue: 377,
		title: 'Add `--dry-run` to the reconcile CLI',
		stage: 'gates',
		author: 'jvoss',
		labels: ['enhancement', 'concurro'],
		sponsor: 'jvoss',
		alert: {
			tone: 'tip',
			title: 'Ready for humans',
			body: 'All reviewers approve head 9c0e41a, no findings are open and CI is green. The pull request is marked ready for review. Concurro never merges.'
		},
		pr: { number: 402, title: 'reconcile: add --dry-run', branch: 'concurro/377-reconcile-dry-run', headSha: '9c0e41a', ci: 'passing', additions: 188, deletions: 12, ready: true },
		plans: [shortPlan('pl_e20b77', 1, 4 * D, 'Add a `--dry-run` flag to `ledger reconcile` that prints the adjustments it would post.', ['Thread a `DryRun` flag through `reconcile::run`.', 'Collect adjustments into a report instead of calling `Ledger::post`.', 'Print the report as a table or as JSON with `--format json`.'], ['src/bin/ledger.rs', 'src/reconcile.rs', 'tests/cli_reconcile.rs'])],
		approvedPlanId: 'pl_e20b77',
		designReview: [designGen(LC, 1, 'pl_e20b77', 4 * D - 2 * H, ['approve', 'approve'])],
		rounds: [round(LC, 1, '5d1a0f2', 2 * D, ['approve', 'changes_requested']), round(LC, 2, '9c0e41a', 1 * D, ['approve', 'approve'])],
		findings: [{ id: 'F-1', raisedBy: 'pr-reviewer-b', raisedRound: 1, status: 'fixed', severity: 'low', title: 'JSON output is not covered by a test', detail: 'Add a snapshot test for `--format json`.', path: 'tests/cli_reconcile.rs', line: 40, thread: 'r1840031' }],
		budgets: budgets([14, 48], [1, 4], [0, 3])
	}, 4 * D + 4 * H, 1 * D),
	mk(LC, {
		issue: 440,
		title: 'Panic on empty batch in bulk import',
		stage: 'intake',
		author: 'rpike',
		labels: ['bug', 'concurro'],
		alert: { tone: 'note', title: 'Intake assessment is running', body: 'Triage is reading the issue and the repository. This usually takes a few minutes.' }
	}, 22, 3),
	mk(LC, {
		issue: 365,
		title: 'Decimal rounding mode is ignored in statement export',
		stage: 'observed_merged',
		atStage: 'gates',
		author: 'tnakata',
		labels: ['bug', 'concurro'],
		sponsor: ME,
		alert: { tone: 'note', title: 'Merged by tnakata', body: 'Pull request #371 was merged into main after handoff. This task is complete.' },
		completion: { kind: 'observed_external', mergeSha: '4c1e9a7', mergedBy: 'tnakata', observedStage: 'gates', handedOff: true, at: ago(6 * D) },
		pr: { number: 371, title: 'export: honour the configured rounding mode', branch: 'concurro/365-export-rounding', headSha: 'b7e3d90', ci: 'passing', additions: 64, deletions: 9, ready: true },
		plans: [shortPlan('pl_0f6a3d', 1, 9 * D, 'Statement export must use `Config::rounding_mode` instead of the hard-coded half-up.', ['Pass the rounding mode into `export::format_amount`.', 'Add golden files for half-even and half-down.'], ['src/export.rs', 'tests/export_golden.rs'])],
		approvedPlanId: 'pl_0f6a3d',
		designReview: [designGen(LC, 1, 'pl_0f6a3d', 9 * D - H, ['approve', 'approve'])],
		rounds: [round(LC, 1, 'b7e3d90', 8 * D, ['approve', 'approve'])],
		budgets: budgets([9, 48], [0, 4], [0, 3])
	}, 9 * D + 3 * H, 6 * D),
	mk(LC, {
		issue: 352,
		title: 'Support negative zero in amount parser',
		stage: 'closed',
		atStage: 'plan',
		author: 'rpike',
		labels: ['question', 'concurro'],
		alert: { tone: 'note', title: 'Issue closed by its author', body: 'The issue was closed on GitHub while planning. Concurro stopped work and released its leases.' },
		budgets: budgets([3, 48], [0, 4], [0, 3])
	}, 12 * D, 11 * D),
	mk(TP, {
		issue: 88,
		title: 'Worker heartbeat misses under clock skew',
		stage: 'implement',
		author: 'tnakata',
		labels: ['bug', 'concurro'],
		sponsor: ME,
		alert: { tone: 'note', title: 'Implementation is running', body: 'The implementer started turn 9 on Actions run 9417730256 eleven minutes ago.' },
		plans: [shortPlan('pl_a8830c', 1, 7 * H, 'Heartbeats must use the monotonic clock so NTP steps cannot mark a healthy worker dead.', ['Replace `time.time()` with `time.monotonic()` in `Heartbeat`.', 'Persist the server-side receive time instead of the worker-reported time.', 'Add a skew simulation to the heartbeat tests.'], ['tidepool/heartbeat.py', 'tidepool/store.py', 'tests/test_heartbeat.py'])],
		approvedPlanId: 'pl_a8830c',
		designReview: [designGen(TP, 1, 'pl_a8830c', 6 * H, ['approve', 'approve'])],
		budgets: budgets([9, 40], [0, 4], [0, 3])
	}, 9 * H, 11),
	mk(TP, {
		issue: 91,
		title: 'Dead-letter replay loses the original enqueue time',
		stage: 'plan_qc',
		author: 'odalby',
		labels: ['bug', 'concurro'],
		sponsor: 'tnakata',
		alert: { tone: 'note', title: 'Design review generation 1 is in progress', body: 'plan-reviewer-a approved. Waiting for plan-reviewer-b.' },
		plans: [shortPlan('pl_66d1fa', 1, 95, 'Replayed jobs keep `enqueued_at` and gain `replayed_at`, so latency metrics stay truthful.', ['Add a nullable `replayed_at` column.', 'Stop overwriting `enqueued_at` in `dlq.replay`.', 'Expose both in the job API.'], ['tidepool/dlq.py', 'migrations/0019_replayed_at.sql', 'tests/test_dlq.py'])],
		designReview: [designGen(TP, 1, 'pl_66d1fa', 40, ['approve', 'pending'])],
		budgets: budgets([4, 40], [0, 4], [0, 3])
	}, 3 * H, 40),
	mk(TP, {
		issue: 79,
		title: 'Backoff jitter is not applied to the first retry',
		stage: 'blocked',
		atStage: 'implement',
		author: 'jvoss',
		labels: ['bug', 'concurro'],
		sponsor: ME,
		paused: 'awaiting_credentials',
		pauseReason: 'OpenAI API key sk-…41d7 is exhausted. The implementer runs on sol61-high.',
		alert: {
			tone: 'caution',
			title: 'Paused: awaiting credentials',
			body: 'Your OpenAI API key is exhausted, so the implementer cannot run. Replace the key under My credentials, then run `/concurro resume`. Completed work and budgets are preserved.'
		},
		plans: [shortPlan('pl_d3c1b8', 1, 2 * D, 'Apply full jitter to every retry delay, including the first.', ['Move jitter into `backoff.delay()` so no caller can skip it.', 'Seed the RNG per job for reproducible tests.'], ['tidepool/backoff.py', 'tests/test_backoff.py'])],
		approvedPlanId: 'pl_d3c1b8',
		designReview: [designGen(TP, 1, 'pl_d3c1b8', 2 * D - H, ['approve', 'approve'])],
		budgets: budgets([8, 40], [0, 4], [0, 3])
	}, 2 * D + 4 * H, 5 * H),
	mk(TP, {
		issue: 95,
		title: 'Support cron expressions with a seconds field',
		stage: 'plan',
		author: 'rpike',
		labels: ['enhancement', 'concurro'],
		alert: { tone: 'note', title: 'Planning is running', body: 'The planner is drafting plan v1.' },
		budgets: budgets([2, 40], [0, 4], [0, 3])
	}, 70, 9),
	mk(TP, {
		issue: 94,
		title: 'Retry budget resets when a consumer reconnects',
		stage: 'observed_merged',
		atStage: 'review',
		author: 'jvoss',
		labels: ['bug', 'concurro'],
		sponsor: 'jvoss',
		alert: {
			tone: 'warning',
			title: 'Merged before handoff',
			body: 'jvoss merged pull request #104 during PR review round 1. One finding was still open and CI was pending. Concurro stopped work on this task.'
		},
		pr: { number: 104, title: 'consumer: keep the retry budget across reconnects', branch: 'concurro/94-retry-budget', headSha: '6d40b2e', ci: 'pending', additions: 58, deletions: 14, ready: false },
		completion: { kind: 'observed_external', mergeSha: 'a93f05c', mergedBy: 'jvoss', observedStage: 'review', handedOff: false, at: ago(5 * H) },
		plans: [shortPlan('pl_51c7d2', 1, 2 * D, 'A reconnect must not reset the per-message retry budget.', ['Move the retry counter from `Connection` to `Delivery`.', 'Carry it across `Consumer.reconnect()`.', 'Test a message that fails across two reconnects.'], ['tidepool/consumer.py', 'tests/test_retry_budget.py'])],
		approvedPlanId: 'pl_51c7d2',
		designReview: [designGen(TP, 1, 'pl_51c7d2', 2 * D - H, ['approve', 'approve'])],
		rounds: [round(TP, 1, '6d40b2e', 7 * H, ['approve', 'changes_requested'])],
		findings: [{ id: 'F-1', raisedBy: 'pr-reviewer-b', raisedRound: 1, status: 'open', severity: 'medium', title: 'Retry counter is not persisted for redelivered messages', detail: 'A broker redelivery creates a new `Delivery`, so the budget still resets after a crash.', path: 'tidepool/consumer.py', line: 188, thread: 'r790412' }],
		budgets: budgets([11, 40], [0, 4], [0, 3])
	}, 2 * D + 2 * H, 5 * H),
	mk(TP, {
		issue: 73,
		title: 'Graceful shutdown drops in-flight acks',
		stage: 'review',
		author: 'tnakata',
		labels: ['bug', 'concurro'],
		sponsor: ME,
		alert: {
			tone: 'warning',
			title: 'CI is failing on head 2ab77c4',
			body: 'Check `test (py3.13)` failed: `test_shutdown_drains_acks` timed out. A repair round starts automatically; fix rounds used 2 of 4.'
		},
		pr: { number: 97, title: 'worker: drain acks before closing the pool', branch: 'concurro/73-shutdown-acks', headSha: '2ab77c4', ci: 'failing', additions: 96, deletions: 31, ready: false },
		plans: [shortPlan('pl_2e9f55', 1, 3 * D, 'On SIGTERM, stop fetching, drain in-flight acks, then close connections.', ['Introduce `Worker.drain(timeout)`.', 'Call it before `pool.close()` in the shutdown handler.', 'Test with a slow ack and a 2s grace period.'], ['tidepool/worker.py', 'tests/test_shutdown.py'])],
		approvedPlanId: 'pl_2e9f55',
		designReview: [designGen(TP, 1, 'pl_2e9f55', 3 * D - H, ['approve', 'approve'])],
		rounds: [round(TP, 1, '81f0c3e', 1 * D, ['changes_requested', 'approve']), round(TP, 2, '2ab77c4', 2 * H, ['changes_requested', 'approve'])],
		findings: tp73findings,
		budgets: budgets([21, 40], [2, 4], [0, 3])
	}, 3 * D + 2 * H, 2 * H),
	mk(AC, {
		issue: 152,
		title: '`atlas init` overwrites an existing config without prompting',
		stage: 'escalated',
		atStage: 'review',
		author: 'odalby',
		labels: ['bug', 'concurro'],
		sponsor: 'jvoss',
		alert: {
			tone: 'caution',
			title: 'Escalated: fix rounds exhausted',
			body: 'Four repair rounds did not resolve F-2. A maintainer needs to take over the pull request, or a writer can run `/concurro retry` with feedback to grant another round.'
		},
		pr: { number: 158, title: 'init: confirm before overwriting config', branch: 'concurro/152-init-overwrite', headSha: 'c08d1e6', ci: 'passing', additions: 143, deletions: 22, ready: false },
		plans: [shortPlan('pl_91b0a2', 1, 6 * D, '`atlas init` must ask before replacing an existing config, and support `--force`.', ['Detect an existing file before writing.', 'Prompt on a TTY; fail with exit code 2 otherwise unless `--force` is set.'], ['cmd/init.go', 'cmd/init_test.go'])],
		approvedPlanId: 'pl_91b0a2',
		designReview: [designGen(AC, 1, 'pl_91b0a2', 6 * D - H, ['approve', 'approve'])],
		rounds: [round(AC, 4, 'c08d1e6', 1 * D, ['approve', 'changes_requested'])],
		findings: [
			{ id: 'F-2', raisedBy: 'pr-reviewer-b', raisedRound: 1, status: 'open', severity: 'high', title: 'Non-TTY behaviour contradicts the documented exit codes', detail: 'docs/cli.md reserves exit code 2 for usage errors. The implementer replied on the thread that this is not a usage error; only pr-reviewer-b can mark it fixed or obsolete.', path: 'cmd/init.go', line: 57, thread: 'r553190' }
		],
		budgets: budgets([30, 32], [4, 4], [0, 3])
	}, 6 * D + 5 * H, 1 * D),
	mk(AC, {
		issue: 160,
		title: 'Shell completion for fish',
		stage: 'rejected',
		atStage: 'intake',
		author: 'rpike',
		labels: ['enhancement', 'concurro'],
		alert: { tone: 'note', title: 'Rejected at intake', body: 'Triage found the request out of scope: completions are generated by the upstream CLI framework and tracked in sample-labs/atlas-cli#122.' },
		intake: [triage(2 * D - 6, 'Out of scope: completions are generated by the upstream CLI framework and tracked in sample-labs/atlas-cli#122.', [], 'reject', 'low')]
	}, 2 * D, 2 * D - 6),
	mk(AC, {
		issue: 149,
		title: 'Config writes are not atomic on crash',
		stage: 'escalated',
		atStage: 'intake',
		author: 'odalby',
		labels: ['bug', 'concurro'],
		alert: {
			tone: 'warning',
			title: 'Escalated',
			body: 'Plan revision budget exhausted: Design reviewers require a revision. A writer can grant capacity with `/concurro retry --plan-revisions 1`.'
		},
		intake: [
			triage(3 * D, 'Clear durability bug with a reproduction.', [], 'proceed', 'high'),
			triage(2 * D, 'The updated issue now also covers the lock file; still actionable.', ['Keep the on-disk format unchanged.'], 'proceed', 'high')
		],
		plans: [
			shortPlan('pl_1c0a77', 1, 3 * D - H, 'Write the config to a temporary file and rename it into place.', ['Write to `config.toml.tmp`.', 'Rename over the original.'], ['internal/config/write.go']),
			shortPlan('pl_5e21d9', 2, 2 * D - H, 'Atomic config and lock-file writes with fsync of the parent directory.', ['Add `atomicWrite(path, data)`.', 'Use it for the config and the lock file.', 'Fsync the directory after rename.'], ['internal/config/write.go', 'internal/lock/lock.go'])
		],
		designReview: [
			designGen(AC, 1, 'pl_1c0a77', 3 * D - 2 * H, ['revise', 'approve'], [['The rename is not durable until the parent directory is fsynced.'], []]),
			designGen(AC, 2, 'pl_5e21d9', 2 * D - 2 * H, ['approve', 'revise'], [[], ['Windows cannot rename over an open file; the plan needs a fallback.']])
		],
		budgets: budgets([14, 32], [0, 4], [3, 3])
	}, 3 * D, 6 * H),
	mk(AC, {
		issue: 147,
		title: 'Config loader ignores XDG_CONFIG_HOME',
		stage: 'publish',
		author: 'tnakata',
		labels: ['bug', 'concurro'],
		sponsor: 'tnakata',
		alert: { tone: 'note', title: 'Publishing the implementation', body: 'Pushing branch concurro/147-xdg-config-home to the fork and opening a draft pull request.' },
		plans: [shortPlan('pl_4c7e10', 1, 1 * D, 'Resolve the config path from `XDG_CONFIG_HOME` before falling back to `~/.config`.', ['Add `config.Dir()` with the XDG lookup.', 'Use it in the loader and in `atlas init`.'], ['internal/config/path.go', 'internal/config/path_test.go'])],
		approvedPlanId: 'pl_4c7e10',
		designReview: [designGen(AC, 1, 'pl_4c7e10', 1 * D - H, ['approve', 'approve'])],
		budgets: budgets([6, 32], [0, 4], [0, 3])
	}, 1 * D + 2 * H, 4),
	mk(AC, {
		issue: 139,
		title: 'Retry uploads on connection reset',
		stage: 'stopped',
		atStage: 'plan_qc',
		author: 'jvoss',
		labels: ['enhancement', 'concurro'],
		sponsor: 'jvoss',
		alert: { tone: 'warning', title: 'Stopped by jvoss', body: 'A writer stopped this task during design review. Run `/concurro resume` to continue from where it stopped.' },
		plans: [shortPlan('pl_bb2d47', 1, 5 * D, 'Retry chunk uploads up to three times on `ECONNRESET` with exponential backoff.', ['Wrap the chunk PUT in a retry helper.', 'Make retries idempotent with the existing chunk checksum.'], ['internal/upload/chunk.go', 'internal/upload/chunk_test.go'])],
		designReview: [designGen(AC, 1, 'pl_bb2d47', 5 * D - H, ['revise', 'pending'], [['Retrying a non-idempotent PUT is only safe if the server deduplicates by checksum. The plan asserts this without evidence.'], []], false)],
		budgets: budgets([5, 32], [0, 4], [0, 3])
	}, 5 * D + 3 * H, 4 * D)
];
