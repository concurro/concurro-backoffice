export type Stage =
	| 'intake'
	| 'clarify'
	| 'plan'
	| 'plan_qc'
	| 'planned'
	| 'implement'
	| 'publish'
	| 'review'
	| 'gates'
	| 'merged'
	| 'observed_merged'
	| 'closed'
	| 'blocked'
	| 'stopped'
	| 'rejected'
	| 'escalated';

export type Mode = 'manual' | 'autonomous';
export type Role = 'triage' | 'planner' | 'plan_reviewer' | 'implementer' | 'pr_reviewer';
export type Provider = 'anthropic' | 'openai';
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
export type AlertTone = 'note' | 'tip' | 'warning' | 'caution';
export type CiStatus = 'passing' | 'failing' | 'pending' | 'none';
export type Command = 'start' | 'approve' | 'retry' | 'resume' | 'stop' | 'invalidate' | 'sponsor';

export interface ModelProfile {
	name: string;
	provider: Provider;
	model: string;
	effort: string;
}

export interface User {
	login: string;
	name: string;
	writer: boolean;
}

export interface RosterEntry {
	role: Role;
	/** Agent identity, e.g. `reviewer-a`. */
	agent: string;
	profile: string;
}

export interface Target {
	owner: string;
	repo: string;
	fork: string;
	description: string;
	mode: Mode;
	defaultBranch: string;
	roster: RosterEntry[];
	config: string;
	/** Model profiles the roster refers to, from the target configuration. */
	profiles?: ModelProfile[];
	/** Whether the signed-in user can push to the target (and so run commands). */
	writer?: boolean;
}

export interface Budget {
	used: number;
	max: number;
}

export interface PlanVersion {
	id: string;
	version: number;
	createdAt: string;
	summary: string;
	body: string;
}

/** Design-review decisions (`plan_qc` schema) and PR-review verdicts (`review` schema). */
export type DesignDecision = 'approve' | 'revise' | 'clarify' | 'reject' | 'escalate';
export type PrVerdict = 'approve' | 'changes_requested' | 'reopen';
/** Triage decisions (intake `qc` schema). */
export type IntakeDecision = 'proceed' | 'clarify' | 'reject' | 'escalate';
export type Verdict = IntakeDecision | DesignDecision | PrVerdict | 'pending';

/** One recorded triage assessment; only the current one carries its concerns. */
export interface IntakeRound {
	agent: string;
	profile: string;
	decision: IntakeDecision;
	risk: string;
	rationale: string;
	concerns: string[];
	at: string;
}

export interface Objection {
	id: string;
	text: string;
	resolved: boolean;
}

export interface DesignReview {
	agent: string;
	profile: string;
	verdict: DesignDecision | 'pending';
	objections: Objection[];
}

export interface DesignReviewGeneration {
	generation: number;
	planId: string;
	at: string;
	reviews: DesignReview[];
}

/** Finding ledger status; `withdrawn` is set by a design reopen and still blocks the merge. */
export type FindingStatus = 'open' | 'fixed' | 'obsolete' | 'withdrawn';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Finding {
	id: string;
	raisedBy: string;
	raisedRound: number;
	status: FindingStatus;
	severity: Severity;
	title: string;
	detail: string;
	path: string;
	line: number;
	thread: string;
}

export interface ReviewRound {
	round: number;
	headSha: string;
	at: string;
	votes: { agent: string; profile: string; verdict: PrVerdict | 'pending' }[];
}

export interface PullRequest {
	number: number;
	title: string;
	branch: string;
	headSha: string;
	ci: CiStatus;
	/** Unknown (`null`) when GitHub only returned the plain pull request listing. */
	additions: number | null;
	deletions: number | null;
	ready: boolean;
}

export interface TimelineEvent {
	id: string;
	at: string;
	kind: 'stage' | 'command' | 'turn' | 'review' | 'github' | 'system';
	actor: string;
	text: string;
	turn?: number;
	tone?: Tone;
}

export interface TaskAlert {
	tone: AlertTone;
	title: string;
	body: string;
}

/** Engine `state.completion` for an observed human merge; gates are never re-verified at merge time. */
export interface TaskCompletion {
	kind: 'observed_external';
	mergeSha: string;
	mergedBy?: string;
	/** Stage the task was in when the merge was observed. */
	observedStage: Stage;
	/** Whether Concurro had handed the PR off before the merge. */
	handedOff: boolean;
	at: string;
}

export interface Task {
	owner: string;
	repo: string;
	issue: number;
	title: string;
	author: string;
	labels: string[];
	stage: Stage;
	/** Last pipeline stage reached; where the stepper sits for terminal or parked stages. */
	atStage: Stage;
	mode: Mode;
	sponsor?: string;
	paused?: 'awaiting_credentials';
	pauseReason?: string;
	question?: string;
	alert: TaskAlert;
	/** The issue description (GitHub Markdown); only the task view loads it. */
	body?: string;
	intake: IntakeRound[];
	pr?: PullRequest;
	completion?: TaskCompletion;
	plans: PlanVersion[];
	approvedPlanId?: string;
	designReview: DesignReviewGeneration[];
	rounds: ReviewRound[];
	findings: Finding[];
	budgets: { modelCalls: Budget; fixRounds: Budget; planRevisions: Budget };
	timeline: TimelineEvent[];
	enrolledAt: string;
	updatedAt: string;
}

export type TurnOutcome =
	| 'ok'
	| 'failed'
	| 'uncertain'
	| 'lost'
	| 'timed_out'
	| 'terminated'
	| 'queue_expired';

export type TranscriptItem =
	| { kind: 'assistant'; text: string }
	| { kind: 'tool_call'; id: string; tool: string; input: string }
	| { kind: 'tool_result'; id: string; output: string; isError?: boolean };

export interface RunJob {
	name: string;
	status: 'success' | 'failure' | 'cancelled' | 'skipped';
	durationS: number;
}

/** GitHub's evidence for one session's workflow run attempt. */
export interface TurnRun {
	id: number;
	attempt: number;
	url: string;
	workflow: string;
	status: string;
	conclusion: string | null;
	session: string;
	association: 'assigned' | 'dispatched';
	jobs: { id: number; name: string; url: string; status: string; conclusion: string | null; durationS: number | null; runner: string | null; labels: string[] }[] | null;
}

/** Missing run history or a failed lookup is reported separately from an empty jobs list. */
export interface TurnRuns {
	runs: TurnRun[];
	message: string | null;
}

export interface Turn {
	/** Exchange turn ID (live data only). */
	id?: string;
	n: number;
	stage: Stage;
	role: Role;
	agent: string;
	profile: string;
	outcome: TurnOutcome;
	startedAt: string;
	queuedMs: number;
	durationMs: number;
	tokens: { input: number | null; cached: number | null; output: number | null };
	run: {
		id: number | null;
		attempt: number | null;
		workflow: string | null;
		runner: string;
		jobs: RunJob[] | null;
		diagnosis?: { tone: AlertTone; title: string; body: string };
	};
	prompt: { instructions: string; snapshot: string; schema: string; untrusted: string };
	transcript: TranscriptItem[];
	response: string;
	validationErrors: string[];
	diff?: string;
}

export type CredentialRouteId =
	| 'anthropic_api'
	| 'claude_subscription'
	| 'openai_api'
	| 'chatgpt_subscription';
export type CredentialStatus = 'valid' | 'expired' | 'exhausted' | 'revoked' | 'missing';

export interface CredentialRoute {
	id: CredentialRouteId;
	label: string;
	provider: Provider;
	kind: 'API key' | 'Subscription';
	status: CredentialStatus;
	fingerprint?: string;
	lastValidated?: string;
	lastUsed?: string;
	note?: string;
}

export interface UsageRow {
	task: string;
	href: string;
	byProfile: Record<string, number>;
}

export interface ActivityItem {
	id: string;
	at: string;
	actor: string;
	text: string;
	task: { owner: string; repo: string; issue: number };
	tone?: Tone;
}

/** One GitHub Actions run, with the task and turns the service recorded for it. */
export interface ActionsRun {
	id: number;
	attempt?: number;
	title: string;
	/** GitHub's own run status, not a turn outcome. */
	status: 'success' | 'failure' | 'in_progress' | 'queued' | 'cancelled';
	/** The task this run served; a run serves one task's turns. */
	task?: { owner: string; repo: string; issue: number };
	issue: number;
	/** The first turn the run served, for the diagnostics link. */
	turn: number;
	startedAt: string;
	/** Wall-clock seconds GitHub reports for the run; 0 while it is still going. */
	durationS: number;
}

/** `GET /api/targets/{owner}/{repo}`; `runsMessage` says why the run list is empty. */
export interface TargetView {
	target: Target;
	tasks: Task[];
	runs: ActionsRun[];
	runsMessage: string | null;
}

export interface OperatorStatus {
	service: { version: string; uptime: string; healthy: boolean };
	queue: { depth: number; running: number; oldestQueuedS: number; capacity: number };
	leases: { id: string; task: string; holder: string; stage: Stage; expiresInS: number; stale: boolean }[];
	unknownWrites: { id: string; task: string; kind: string; detail: string; at: string }[];
	drift: {
		target: string;
		servedEngine: string;
		workflowRef: string;
		inSync: boolean;
		note: string;
	}[];
	sessions: {
		id: string;
		task: string;
		role: Role;
		route: string;
		state: 'active' | 'settled' | 'expired';
		startedAt: string;
		calls: number;
	}[];
	gateway: {
		route: string;
		healthy: boolean;
		latencyMs: number;
		errorRate: number;
		budget: Budget;
		unit: string;
	}[];
}

export interface NeedsYouItem {
	kind: 'plan_approval' | 'input_needed' | 'credentials' | 'ci_red';
	task: Task;
	text: string;
}
