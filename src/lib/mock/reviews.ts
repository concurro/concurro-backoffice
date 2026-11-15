import { shortSha } from '#lib/format.ts';
import type { Finding, Report, ReportSummary, ReviewRequestRound, ReviewSummary, ReviewTask, Sponsorship } from '#lib/types.ts';
import { ago, D, H } from './time';

const LC = { owner: 'example-org', repo: 'ledger-core' };
const TP = { owner: 'example-org', repo: 'tidepool' };

const sha = (seed: string) => seed.repeat(Math.ceil(40 / seed.length)).slice(0, 40);
const sponsorships = (calls: number): Sponsorship => ({
	funding: 'org',
	provider_funding: { openai: 'org', anthropic: 'org' },
	status: 'confirmed',
	task_stage: null,
	calls,
	charged_calls: [{ id: `mock-review-org-${calls}`, kind: 'org', provider: null, calls }],
	slots: { anthropic: { sponsor_id: '84', login: 'jvoss', status: 'active', epoch: 1 } }
});

const A = { reviewer: 'reviewer-a', model: 'sol61-high' };
const B = { reviewer: 'reviewer-b', model: 'opus55-high' };
const C = { reviewer: 'reviewer-c', model: 'sol61-medium' };

const report = (
	id: string,
	who: typeof A,
	round: number,
	head: string,
	minutes: number,
	content: Report['content']
): Report => ({
	id,
	step: 'review',
	...who,
	round,
	head,
	outcome: 'ok',
	at: ago(minutes),
	kind: 'review',
	title: `Round ${round} review by ${who.reviewer}`,
	details: {},
	digest: `sha256:${sha(id.length.toString(16) + 'c4')}`,
	artifacts: [],
	content
});

const summary = ({ id, step, reviewer, model, round, head, outcome, at }: Report): ReportSummary => ({ id, step, reviewer, model, round, head, outcome, at });

const HEAD_1 = sha('3fa9c1e');
const HEAD_2 = sha('b71d04a');
const BASE = sha('9e2f6d0');
const TIP_1 = sha('1c8a5b3');
const TIP_2 = sha('d05e7f2');

const batchReports: Report[] = [
	report('r1-reviewer-a', A, 1, HEAD_1, 2 * D + 2 * H, {
		verdict: 'changes_requested',
		headline: 'A failed fsync leaves acknowledged writes in the batch',
		summary:
			'The batching itself is sound and the new `BatchWriter` keeps entry order.\n\n## Concern\n\n- A failed `fsync` returns the error but keeps the entries queued, so callers that were already acknowledged can be written twice on retry.\n- No test exercises the failure path.\n\n```rust\nself.file.sync_data()?; // entries stay in self.pending\n```',
		findings: [
			{
				severity: 'high',
				title: 'Acknowledged entries are replayed after a failed fsync',
				path: 'src/ledger/batch.rs',
				start_line: 118,
				line: 131,
				detail: '`flush` returns early on a sync error without clearing or poisoning `pending`. The next `flush` writes the same entries again.'
			}
		],
		dispositions: [],
		finding_ids: ['F1']
	}),
	report('r1-reviewer-b', B, 1, HEAD_1, 2 * D + 2 * H - 6, {
		verdict: 'approve',
		headline: 'Correct batching; one naming nit',
		summary: 'Entry order and durability match the unbatched path on the happy path. The benchmark numbers in the description reproduce.',
		findings: [
			{
				severity: 'low',
				title: '`max_delay` is in milliseconds but is not named so',
				path: 'src/ledger/config.rs',
				start_line: null,
				line: 42,
				detail: 'Every other duration in `LedgerConfig` carries its unit. Rename to `max_delay_ms`.'
			}
		],
		dispositions: [],
		finding_ids: ['F2']
	}),
	report('r2-reviewer-b', B, 2, HEAD_2, 14, {
		verdict: 'approve',
		summary: 'The rename landed and nothing else in my earlier review is affected by the new commits.',
		findings: [],
		dispositions: [{ id: 'F2', status: 'fixed', evidence: '`max_delay_ms` is used throughout `src/ledger/config.rs` and its callers as of this head.' }]
	})
];

/** Listed for round 1, but its stored evidence no longer matches: the report read fails. */
const UNAVAILABLE: ReportSummary = { id: 'r1-reviewer-c', step: 'review', ...C, round: 1, head: HEAD_1, outcome: 'ok', at: ago(2 * D + 2 * H - 9) };

const batchFindings: Finding[] = [
	{
		id: 'F1',
		raisedBy: 'reviewer-a',
		raisedRound: 1,
		status: 'open',
		severity: 'high',
		title: 'Acknowledged entries are replayed after a failed fsync',
		detail: '`flush` returns early on a sync error without clearing or poisoning `pending`.',
		path: 'src/ledger/batch.rs',
		line: 131,
		thread: 'PRRT_mock_f1'
	},
	{
		id: 'F2',
		raisedBy: 'reviewer-b',
		raisedRound: 1,
		status: 'fixed',
		severity: 'low',
		title: '`max_delay` is in milliseconds but is not named so',
		detail: 'Rename to `max_delay_ms`.',
		path: 'src/ledger/config.rs',
		line: 42,
		thread: 'PRRT_mock_f2'
	}
];

const batchRounds: ReviewRequestRound[] = [
	{
		round: 1,
		head: HEAD_1,
		base: BASE,
		baseRef: 'main',
		baseTip: TIP_1,
		requestedBy: 'jvoss',
		requestedAt: ago(2 * D + 3 * H),
		opened: ago(2 * D + 3 * H),
		started: ago(2 * D + 3 * H - 2),
		completed: ago(2 * D + 2 * H - 9),
		outcome: 'complete',
		cancelled: false,
		reviewers: [
			{ ...A, verdict: 'changes_requested', reportId: 'r1-reviewer-a' },
			{ ...B, verdict: 'approve', reportId: 'r1-reviewer-b' },
			{ ...C, verdict: 'approve', reportId: UNAVAILABLE.id }
		]
	},
	{
		round: 2,
		head: HEAD_2,
		base: BASE,
		baseRef: 'main',
		baseTip: TIP_2,
		requestedBy: 'mkeller',
		requestedAt: ago(26),
		opened: ago(26),
		started: ago(24),
		completed: '',
		outcome: 'active',
		cancelled: false,
		reviewers: [
			{ ...A, verdict: 'pending', reportId: null },
			{ ...B, verdict: 'approve', reportId: 'r2-reviewer-b' }
		]
	}
];

const TP_HEAD = sha('5d2e8b7');
const TP_NOW = sha('e94a1c6');
const TP_BASE = sha('0ab3f59');
const TP_TIP = sha('7c61d2e');

const tideReports: Report[] = [
	report('r1-reviewer-a', A, 1, TP_HEAD, 5 * H, {
		verdict: 'approve',
		headline: 'Retry backoff is bounded and tested',
		summary: 'The jittered backoff caps at `max_backoff` and the new property test covers the overflow case.',
		findings: [],
		dispositions: []
	}),
	report('r1-reviewer-b', B, 1, TP_HEAD, 5 * H - 4, {
		verdict: 'approve',
		summary: 'No findings. The change is confined to `sync/retry.ts` and its tests.',
		findings: [],
		dispositions: []
	})
];

export const reviews: ReviewTask[] = [
	{
		kind: 'standalone_pr_review',
		...LC,
		pr: 412,
		title: 'Batch ledger writes behind a single fsync',
		author: 'odalby',
		stage: 'review',
		active: true,
		alert: { tone: 'note', title: 'Round 2 is under review', body: 'One of two reviewers has finished. Reviews are published on the pull request as each reviewer completes.' },
		round: 2,
		snapshot: { head: HEAD_2, base: BASE, baseRef: 'main', baseTip: TIP_2, title: 'Batch ledger writes behind a single fsync' },
		observed: { head: HEAD_2, baseRef: 'main', baseTip: TIP_2, title: 'Batch ledger writes behind a single fsync', draft: false, open: true, merged: false },
		changedSinceReview: false,
		rounds: batchRounds,
		findings: batchFindings,
		reports: [...batchReports.map(summary), UNAVAILABLE],
		budgets: { modelCalls: { used: 4, max: 12 } },
		check: { round: 2, attempt: 1, published: true, pending: false, completed: false },
		enrolledAt: ago(2 * D + 3 * H),
		updatedAt: ago(14),
		sponsorships: sponsorships(4),
		revision: 'mock-review-412-2'
	},
	{
		kind: 'standalone_pr_review',
		...TP,
		pr: 88,
		title: 'Cap sync retry backoff with jitter',
		author: 'rpike',
		stage: 'complete',
		active: false,
		alert: { tone: 'tip', title: 'Round 1 is complete', body: 'Both reviewers approved the reviewed snapshot. Request `ConcurroBot` again for a new assessment.' },
		round: 1,
		snapshot: { head: TP_HEAD, base: TP_BASE, baseRef: 'main', baseTip: TP_TIP, title: 'Cap sync retry backoff' },
		observed: { head: TP_NOW, baseRef: 'main', baseTip: TP_TIP, title: 'Cap sync retry backoff with jitter', draft: false, open: true, merged: false },
		changedSinceReview: true,
		rounds: [
			{
				round: 1,
				head: TP_HEAD,
				base: TP_BASE,
				baseRef: 'main',
				baseTip: TP_TIP,
				requestedBy: 'tnakata',
				requestedAt: ago(6 * H),
				opened: ago(6 * H),
				started: ago(6 * H - 3),
				completed: ago(5 * H - 4),
				outcome: 'complete',
				cancelled: false,
				reviewers: [
					{ ...A, verdict: 'approve', reportId: 'r1-reviewer-a' },
					{ ...B, verdict: 'approve', reportId: 'r1-reviewer-b' }
				]
			}
		],
		findings: [],
		reports: tideReports.map(summary),
		budgets: { modelCalls: { used: 2, max: 12 } },
		check: { round: 1, attempt: 1, published: true, pending: false, completed: true },
		enrolledAt: ago(6 * H),
		updatedAt: ago(40),
		sponsorships: sponsorships(2),
		revision: 'mock-review-88-1'
	}
];

const key = (t: { owner: string; repo: string; pr: number }) => `${t.owner}/${t.repo}#${t.pr}`;

/** Full reports by review; a listed report missing here has unavailable evidence. */
export const reports: Record<string, Report[]> = { [key(reviews[0])]: batchReports, [key(reviews[1])]: tideReports };
export const reportsFor = (t: { owner: string; repo: string; pr: number }) => reports[key(t)] ?? [];

/** What lists show of a review that the task itself does not carry. */
const listed: Record<string, Pick<ReviewSummary, 'branch' | 'ci'>> = {
	[key(reviews[0])]: { branch: 'odalby:batch-fsync', ci: 'pending' },
	[key(reviews[1])]: { branch: 'rpike:retry-backoff', ci: 'passing' }
};

export const reviewSummary = (t: ReviewTask): ReviewSummary => ({
	owner: t.owner,
	repo: t.repo,
	pr: t.pr,
	title: t.observed.title,
	open: t.observed.open,
	draft: t.observed.draft,
	headSha: shortSha(t.observed.head),
	updatedAt: t.updatedAt,
	...(listed[key(t)] ?? { branch: '', ci: 'none' })
});
