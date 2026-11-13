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
	| 'awaiting_credentials'
	| 'budget_exhausted'
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
export type Command = 'start' | 'approve' | 'retry' | 'resume' | 'stop' | 'invalidate' | 'sponsor' | 'withdraw';

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

/** Trusted configured route, separate from the CLI harness and display model profile. */
export interface CredentialRequirement {
    role: string;
    profile: string;
    model: string;
    route: string | null;
    provider: Provider | null;
    status?: string;
}

/** An issue identity works before a task checkpoint exists. */
export interface IssueRef { owner: string; repo: string; issue: number; }

/** Prospective provider owner, not the actual org-paid inference binding. */
export interface SponsorSlot {
    sponsor_id?: string | null;
    login?: string;
    status?: string;
    epoch?: number;
    provenance?: string;
}

/** Nonsecret daemon projection; pending source evidence must stay visibly pending. */
export interface Sponsorship {
    funding?: 'org' | 'contributed' | 'unknown';
    /** Sanitized gateway observations; absent usage stays unknown. */
    observations_status?: 'available' | 'unknown';
    observations?: { request: string; source?: string; completed?: boolean; category: string | null; usage: { input_tokens: number; output_tokens: number } | null; binding: { sponsorship_provider: Provider; sponsor: string; credential_version: number } }[];
    status: string;
    task_status?: string | null;
    slots: Partial<Record<Provider, SponsorSlot>>;
    source_slots?: Partial<Record<Provider, SponsorSlot>>;
    coverage?: Partial<Record<Provider, CredentialRequirement[]>>;
    pending?: string[];
    facts?: { actor_id: string; provider: Provider; command: string }[];
}

/** A visible issue intent with no invented stage, budget or enrollment state. */
export interface IssueIntent extends IssueRef {
    title: string;
    author: string;
    labels: string[];
    updatedAt: string;
    body?: string;
    sponsorships?: Sponsorship;
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
	credentialRequirements?: CredentialRequirement[] | null;
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
	sponsorships?: Sponsorship;
	paused?: 'awaiting_credentials' | 'budget_exhausted';
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
	tokens: { input: number; cached: number; output: number };
	run: {
		id: number;
		attempt: number;
		workflow: string;
		runner: string;
		jobs: RunJob[];
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
export type CredentialStatus = 'valid' | 'invalid' | 'expired' | 'exhausted' | 'revoked' | 'missing';

/** Write-only candidate metadata; model defaults come from configured route requirements. */
export interface CredentialCandidate {
    /** Distinct models validated atomically with this token. */
    models?: string[];
    /** Supplied ChatGPT account header; not authenticated account identity. */
    account_id?: string;
}

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
    route?: string | null;
    registrationAvailable?: boolean;
    models?: string[] | null;
    version?: number;
    expiresAt?: string | null;
    expiryKnown?: boolean;
    statusReason?: string | null;
    /** Opaque account hint supplied with this credential version. */
    accountLabel?: string | null;
    /** True only with authenticated evidence, never merely a successful probe. */
    accountVerified?: boolean;
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

export interface ActionsRun {
	id: number;
	title: string;
	status: 'success' | 'failure' | 'in_progress' | 'queued' | 'cancelled';
	issue: number;
	turn: number;
	startedAt: string;
	durationS: number;
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
