import type { ActionsRun, Budget, Finding, IssueIntent, ReviewSummary, ReviewTask, Sponsorship, Stage, Target, Task, TimelineEvent, Turn } from '#lib/types.ts';
import type { ReadIndexRow, ReadTarget, ReadTask, ReadTaskDetail } from './read-model.ts';

/** Treat missing or malformed optional source fields as absent. */
const object = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const string = (value: unknown): string => typeof value === 'string' ? value : '';
const integer = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const budget = (value: unknown): Budget => ({ used: integer(object(value).used), max: integer(object(value).max) });
const array = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.map(object) : [];
const text = (value: unknown): string => typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value, null, 2);
const base64Text = (value: unknown): string => {
	if (typeof value !== 'string' || !value) return '';
	try { return new TextDecoder().decode(Uint8Array.from(atob(value), (character) => character.charCodeAt(0))); }
	catch { return ''; }
};

/** Split a retained prompt document into the existing diagnostic sections. */
function promptParts(value: unknown): Turn['prompt'] {
	let document = value;
	if (typeof value === 'string') {
		try { document = JSON.parse(value); }
		catch { return { instructions: value, snapshot: '', schema: '', untrusted: '' }; }
	}
	const prompt = object(document);
	return {
		instructions: text(prompt.instructions), snapshot: text(prompt.repository_snapshot),
		schema: text(prompt.response_schema), untrusted: text(prompt.untrusted_context)
	};
}

/** Extract an Actions run number from a retained session or status event. */
function runId(value: unknown): number | null {
	if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null;
	if (typeof value !== 'string') return null;
	const match = value.match(/(?:^|\/runs\/)(\d+)(?:\/\d+)?$/);
	return match ? Number(match[1]) : null;
}

/** Use the retained provider slots and the viewer's own consent receipts. */
export function sponsorshipFromRead(records: { entity: string; body: Record<string, unknown> }[]): Sponsorship | undefined {
	const state = records.find((record) => record.entity === 'consent_state')?.body;
	const facts = records.filter((record) => ['consent', 'consent_removal', 'standalone_funding', 'standalone_funding_removal'].includes(record.entity));
	if (!state && !facts.length) return undefined;
	const slots = object(state?.slots) as Sponsorship['slots'];
	const funding = object(state?.provider_funding) as Sponsorship['provider_funding'];
	return {
		status: state ? 'confirmed' : 'pending',
		slots, provider_funding: funding,
		history: facts.map((record) => ({
			transition: record.entity.includes('removal') ? 'withdraw' : string(object(record.body.fact).command) || 'consent',
			provider: string(record.body.provider), reason: string(object(record.body.fact).reason)
		})),
		facts: facts.map((record) => ({
			actor_id: String(object(object(record.body.fact).actor).id ?? ''),
			provider: string(record.body.provider) as 'anthropic' | 'openai',
			command: record.entity.includes('removal') ? 'withdraw' : string(object(record.body.fact).command) || 'consent'
		}))
	};
}

/** Normalize the reader's own-only receipts to the same consent view. */
function taskSponsorship(detail?: ReadTaskDetail): Sponsorship | undefined {
	const records = detail?.records ?? detail?.own_consent?.map((body) => ({
		entity: body.slots ? 'consent_state' : 'consent', body
	})) ?? [];
	const sponsorship = sponsorshipFromRead(records);
	if (sponsorship && !detail?.records) sponsorship.scope = 'own';
	return sponsorship;
}

/** Keep the source finding's recorded status and location in the existing ledger. */
function findingFromRead(source: Record<string, unknown>, round = 0): Finding {
	const finding = object(source.finding);
	return {
		id: string(source.id) || string(source.finding_id), raisedBy: string(source.reviewer_id),
		raisedRound: integer(source.round) || round,
		status: (['open', 'fixed', 'obsolete', 'withdrawn'].includes(string(source.status)) ? source.status : 'open') as Finding['status'],
		severity: (['critical', 'high', 'medium', 'low'].includes(string(finding.severity)) ? finding.severity : 'medium') as Finding['severity'],
		title: string(finding.title), detail: string(finding.detail),
		path: string(finding.path), line: integer(finding.line) || integer(finding.start_line),
		thread: string(source.thread_node_id)
	};
}

/** Decode the JSON body retained after the report artifact's identity marker. */
export function reportArtifact(value: unknown): Record<string, unknown> {
	if (typeof value !== 'string' || !value.startsWith('<!-- concurro:task-report:')) return {};
	const separator = value.indexOf('\n');
	if (separator < 0) return {};
	try { return object(JSON.parse(value.slice(separator + 1))); }
	catch { return {}; }
}

/** Present a configured target through the existing navigation and task pages. */
export function targetFromRead(source: ReadTarget): Target {
	const [owner, repo] = source.upstream.split('/');
	return {
		owner, repo, fork: source.fork, issueRepositories: [source.issue_repository],
		description: '', mode: 'manual', defaultBranch: '', roster: [],
		config: JSON.stringify({ upstream: source.upstream, issue_repository: source.issue_repository, fork: source.fork }, null, 2), writer: true
	};
}

/** Convert one durable issue-list row into the unenrolled issue view. */
export function issueFromIndex(source: ReadIndexRow, repository: string): IssueIntent {
	const document = object(source.document);
	const [owner, repo] = repository.split('/');
	const labels = Array.isArray(document.labels) ? document.labels.map((item) =>
		string(typeof item === 'string' ? item : object(item).name)).filter(Boolean) : [];
	return {
		owner, repo, issue: integer(document.number), title: string(document.title) || `Issue #${source.item_id}`,
		author: string(object(document.user).login), labels,
		updatedAt: string(document.updated_at) || source.source_at, body: string(document.body)
	};
}

/** Build the existing task page from the canonical task snapshot and safe summary. */
export function taskFromRead(source: ReadTask, detail?: ReadTaskDetail): Task {
	const [owner, repo] = source.repository.split('/');
	const history = object(detail?.history);
	const snapshot = object(detail?.records?.find((record) => record.entity === 'contribution_task')?.body.snapshot);
	const plan = object(snapshot.plan);
	const rawPlan = object(plan.body);
	const planId = string(plan.id) || source.plan_id || '';
	const budgets = object(snapshot.budgets);
	const pull = object(snapshot.pull_request);
	const prUrl = string(pull.url) || source.pull_request || '';
	const prNumber = integer(pull.number) || integer(prUrl.match(/\/pull\/(\d+)/)?.[1] ? Number(prUrl.match(/\/pull\/(\d+)/)?.[1]) : 0);
	const stage = source.stage as Stage;
	const updatedAt = source.updated_at || '';
	const plans = array(history.plans).filter((item) => item.accepted === true).map((item, index) => {
		const report = object(item.report);
		return {
			id: string(item.plan_id), version: index + 1, createdAt: string(item.recorded_at),
			summary: string(report.summary) || string(report.headline), body: string(report.plan) || text(report)
		};
	});
	if (planId && !plans.some((item) => item.id === planId)) plans.push({
		id: planId, version: plans.length + 1, createdAt: updatedAt,
		summary: string(rawPlan.summary) || string(rawPlan.headline),
		body: string(rawPlan.plan) || text(rawPlan)
	});
	const intake = array(history.attempts).filter((item) => item.operation === 'intake' && object(item.report).accepted === true)
		.map((item) => {
			const report = object(object(item.report).raw_report);
			return {
				agent: string(item.id), profile: '', decision: string(report.decision) as Task['intake'][number]['decision'],
				risk: string(report.risk), rationale: string(report.rationale),
				concerns: Array.isArray(report.concerns) ? report.concerns.map(string) : [], at: string(item.admitted_at)
			};
		});
	const designReview = array(history.design).map((batch) => ({
		generation: integer(batch.generation), planId: string(batch.plan_id), at: string(batch.recorded_at),
		reviews: array(batch.seats).map((seat) => ({
			agent: string(seat.reviewer_id), profile: string(object(seat.identity).profile),
			verdict: (string(object(seat.report).decision) || 'pending') as Task['designReview'][number]['reviews'][number]['verdict'],
			objections: array(object(seat.report).objections).map((objection) => ({
				id: string(objection.id), text: string(objection.detail) || string(objection.text)
			}))
		}))
	}));
	const rounds = array(history.pr_reviews).map((batch) => ({
		round: integer(batch.round), headSha: string(batch.head), at: string(batch.recorded_at),
		votes: array(batch.seats).map((seat) => ({
			agent: string(seat.reviewer_id), profile: '',
			verdict: (string(object(seat.report).verdict) || 'pending') as Task['rounds'][number]['votes'][number]['verdict']
		}))
	}));
	const timeline: TimelineEvent[] = [
		...array(history.requests).map((item) => ({
			id: string(item.id), at: string(item.source_at), kind: 'command' as const,
			actor: string(object(item.actor).login), text: `${text(item.kind)}: ${string(item.status)}`
		})),
		...array(history.attempts).map((item) => ({
			id: string(item.id), at: string(item.admitted_at), kind: 'turn' as const,
			actor: string(item.operation), text: `${string(item.operation)}: ${string(item.status)}`
		}))
	].sort((a, b) => a.at.localeCompare(b.at));
	return {
		id: source.id, revision: String(source.revision), owner, repo, issue: source.issue_number,
		title: source.title || string(snapshot.title) || `Issue #${source.issue_number}`,
		author: source.author || string(object(snapshot.author).login), labels: [], stage,
		atStage: stage, mode: source.mode === 'autonomous' ? 'autonomous' : 'manual',
		alert: {
			tone: stage === 'blocked' || stage === 'escalated' ? 'warning' : 'note',
			title: source.reason || stage.replaceAll('_', ' '),
			body: source.reason || 'Current durable task state.'
		},
		intake, plans,
		currentPlan: planId ? { id: planId } : undefined,
		designReview, rounds, findings: array(history.review_findings).map((finding) => findingFromRead(finding)),
		sponsorships: taskSponsorship(detail),
		budgets: {
			modelCalls: budget(budgets.model_calls), fixRounds: budget(budgets.fix_rounds),
			planRevisions: budget(budgets.plan_revisions)
		},
		timeline, enrolledAt: string(object(history.state).started_at) || updatedAt, updatedAt,
		pr: prNumber ? {
			number: prNumber, title: string(pull.title), branch: string(pull.branch),
			headSha: string(pull.head_sha), ci: 'unknown', additions: null, deletions: null,
			ready: stage === 'ready'
		} : undefined
	};
}

/** Convert one standalone review summary into a list row. */
export function reviewSummaryFromRead(source: ReadTask): ReviewSummary {
	const [owner, repo] = source.repository.split('/');
	return {
		owner, repo, pr: source.issue_number, title: source.title || `Pull request #${source.issue_number}`,
		open: source.stage !== 'closed', draft: false, branch: '', headSha: '', ci: 'none',
		updatedAt: source.updated_at || ''
	};
}

/** Convert the current standalone review snapshot into its existing command page. */
export function reviewFromRead(source: ReadTask, detail: ReadTaskDetail): ReviewTask {
	const [owner, repo] = source.repository.split('/');
	const history = object(detail.history);
	const row = object(detail.records?.find((record) => record.entity === 'standalone_review')?.body);
	const frozen = object(row.snapshot);
	const index = object(detail.records?.find((record) =>
		record.entity === 'target_index' && object(record.body).kind === 'pull')?.body.document);
	const head = string(frozen.head);
	const currentHead = string(object(index.head).sha) || head;
	const round = integer(row.round);
	const updatedAt = source.updated_at || '';
	const reports = (detail.records ?? []).filter((record) => record.entity === 'report'
		&& record.body.status === 'confirmed'
		&& string(record.body.standalone_task_id) === source.id).map((record) => {
		const artifact = reportArtifact(record.body.body);
		return {
			id: string(record.body.report_id), step: 'review', reviewer: string(artifact.reviewer),
			model: '', round: integer(artifact.round) || null,
			head: string(artifact.head) || head,
			outcome: string(artifact.validation), at: string(record.body.recorded_at)
		};
	});
	const reviewRounds = array(history.rounds);
	const reviewAttempts = array(history.attempts);
	const reviewers = reviewAttempts.filter((attempt) => integer(attempt.round) === round).map((attempt) => {
		return {
			reviewer: string(attempt.reviewer_id), verdict: string(object(attempt.validated_report).verdict) || 'pending',
			reportId: reports.find((report) => report.reviewer === string(attempt.reviewer_id))?.id ?? null,
			model: ''
		};
	});
	const currentCheck = array(history.checks).at(-1);
	return {
		kind: 'standalone_pr_review', owner, repo, pr: source.issue_number,
		title: source.title || string(frozen.title) || `Pull request #${source.issue_number}`,
		author: source.author || string(frozen.author), stage: source.stage,
		active: ['queued', 'review', 'publishing'].includes(source.stage),
		alert: { tone: source.stage === 'blocked' ? 'warning' : 'note',
			title: source.reason || source.stage, body: source.reason || 'Current durable review state.' },
		round, snapshot: {
			head, base: string(frozen.merge_base), baseRef: string(frozen.base_ref),
			baseTip: string(frozen.base_tip), title: string(frozen.title)
		},
		observed: {
			head: currentHead, baseRef: string(object(index.base).ref) || string(frozen.base_ref),
			baseTip: string(object(index.base).sha) || string(frozen.base_tip),
			title: string(index.title) || string(frozen.title), draft: index.draft === true,
			open: index.state !== 'closed', merged: index.merged === true
		},
		changedSinceReview: !!head && currentHead !== head,
		rounds: reviewRounds.map((item) => {
			const pinned = object(item.snapshot);
			const number = integer(item.number);
			return {
				round: number, head: string(pinned.head), base: string(pinned.merge_base),
				baseRef: string(pinned.base_ref), baseTip: string(pinned.base_tip),
				requestedBy: string(object(pinned.requested_by).login), requestedAt: string(pinned.requested_at),
				opened: string(item.opened_at), started: string(item.opened_at), completed: string(item.completed_at),
				outcome: string(item.status), cancelled: item.status === 'cancelled',
				reviewers: number === round ? reviewers : reviewAttempts.filter((attempt) => integer(attempt.round) === number).map((attempt) => ({
					reviewer: string(attempt.reviewer_id), verdict: string(object(attempt.validated_report).verdict) || 'pending',
					reportId: reports.find((report) => report.reviewer === string(attempt.reviewer_id) && report.round === number)?.id ?? null,
					model: ''
				}))
			};
		}), findings: array(history.findings).map((finding) => findingFromRead(finding)), reports,
		budgets: { modelCalls: { used: integer(row.used_model_calls), max: integer(object(frozen.configuration).max_model_calls) } },
		check: { round: currentCheck ? integer(currentCheck.round) : null,
			attempt: currentCheck ? integer(currentCheck.attempt) : null,
			published: !!currentCheck?.run_id, pending: !!currentCheck && !currentCheck.completed,
			completed: currentCheck?.completed === true },
		sponsorships: taskSponsorship(detail),
		enrolledAt: updatedAt, updatedAt, revision: String(source.revision)
	};
}

/** Resolve live turn artifacts while retaining baseline and imported diagnostics. */
export async function turnsFromRead(
	detail: ReadTaskDetail, readArtifact: (turn: string, digest: string) => Promise<unknown>
): Promise<Turn[]> {
	const attempts = array(object(detail.history).attempts);
	const ordinal = new Map(attempts.map((attempt, index) => [string(attempt.id), index + 1]));
	const live = await Promise.all((detail.records ?? []).filter((record) => record.entity === 'turn').map(async (record, index) => {
		const body = object(record.body);
		const submitted = object(body.submitted);
		const status = object(body.status_snapshot);
		const finished = object(body.finished);
		const attempt = attempts.find((item) => string(item.id) === string(body.turn_id)) ?? {};
		const result = object(body.result);
		const operation = string(body.operation) || string(submitted.stage);
		const role = string(submitted.role) || ({ plan: 'planner', plan_qc: 'plan_reviewer', review: 'pr_reviewer', implement: 'implementer' } as Record<string, string>)[operation] || 'triage';
		const sessions = array(body.runner_sessions);
		const firstRun = sessions.find((session) => runId(session.run_id));
		const runner = object(status.runner);
		const promptDigest = string(object(submitted.prompt).sha256);
		const responseDigest = string(object(finished.response).sha256);
		const [promptArtifact, responseArtifact] = await Promise.all([
			promptDigest && !body.prompt_body_base64 ? readArtifact(string(body.turn_id), promptDigest) : undefined,
			responseDigest && !body.result_raw_base64 && result.response == null
				? readArtifact(string(body.turn_id), responseDigest) : undefined
		]);
		const prompt = promptParts(base64Text(body.prompt_body_base64) || promptArtifact);
		const resultText = result.response != null ? text(result.response)
			: responseArtifact != null ? text(responseArtifact) : base64Text(body.result_raw_base64);
		const validation = object(attempt.report).validation_error || object(body.standalone).failure_reason || finished.reason;
		const rawOutcome = string(result.outcome) || string(finished.outcome) || string(body.status);
		const outcome = rawOutcome === 'succeeded' ? 'ok' : rawOutcome === 'unknown' ? 'uncertain' : rawOutcome;
		const elapsed = finished.elapsed_seconds;
		const started = string(status.started_at);
		const submittedAt = string(submitted.submitted_at) || string(body.admitted_at);
		return {
			id: string(body.turn_id), n: ordinal.get(string(body.turn_id)) ?? index + 1,
			stage: (string(submitted.stage) || operation) as Stage,
			role: role as Turn['role'], agent: string(submitted.role) || role,
			profile: string(submitted.profile),
			outcome: (['ok', 'failed', 'lost', 'timed_out', 'terminated', 'queue_expired'].includes(outcome) ? outcome : 'uncertain') as Turn['outcome'],
			startedAt: submittedAt, queuedMs: started && submittedAt ? Math.max(0, Date.parse(started) - Date.parse(submittedAt)) : 0,
			durationMs: typeof elapsed === 'number' && Number.isFinite(elapsed) ? Math.max(0, elapsed * 1000) : 0,
			tokens: { input: null, cached: null, output: null },
			run: { id: runId(firstRun?.run_id) ?? runId(runner.run_id), attempt: integer(runner.run_attempt) || null,
				workflow: null, runner: string(firstRun?.session_id) || string(runner.session_id), jobs: null },
			prompt,
			transcript: [], response: resultText,
			validationErrors: validation ? [text(validation)] : []
		} satisfies Turn;
	}));
	const imported = (detail.records ?? []).filter((record) => record.entity === 'imported_turn')
		.map((record, index) => {
			const body = object(record.body);
			const source = object(body.source_record);
			return {
				id: `import:${string(body.deployment)}:${string(body.source_id)}`,
				n: live.length + index + 1, stage: (string(body.stage) || 'intake') as Stage,
				role: (string(source.role) || 'triage') as Turn['role'], agent: string(source.agent) || 'Python',
				profile: string(source.profile), outcome: (string(body.status) === 'completed' ? 'ok' : 'uncertain') as Turn['outcome'],
				startedAt: string(source.started_at), queuedMs: 0, durationMs: 0,
				tokens: { input: null, cached: null, output: null },
				run: { id: integer(body.serving_run) || null, attempt: null, workflow: null,
					runner: string(body.serving_session), jobs: null },
				prompt: { instructions: text(source.prompt), snapshot: '', schema: '', untrusted: '' },
				transcript: [], response: text(source.result), validationErrors: []
			} satisfies Turn;
		});
	return [...live, ...imported].sort((a, b) => a.n - b.n);
}

/** Show each run's latest retained attempt, with the newest work first. */
export function runsFromRead(rows: ReadIndexRow[]): ActionsRun[] {
	const latest = new Map<number, ActionsRun>();
	for (const row of rows) {
		const item = row.document;
		const id = integer(item.id) || Number(row.item_id.split('/')[0]);
		const attempt = integer(item.attempt) || integer(item.run_attempt) || 1;
		if ((latest.get(id)?.attempt ?? 0) > attempt) continue;
		const startedAt = string(item.created_at) || row.source_at;
		latest.set(id, {
			id, attempt, title: string(item.display_title) || string(item.name) || string(item.head_branch) || `Run #${id}`,
			status: (string(item.conclusion) || string(item.status) || 'queued') as ActionsRun['status'],
			issue: null, turn: null, startedAt, durationS: 0
		});
	}
	return [...latest.values()].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || b.id - a.id);
}
