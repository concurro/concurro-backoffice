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
export type CiStatus = 'passing' | 'failing' | 'pending' | 'none' | 'unknown';
export type Command = 'funding' | 'start' | 'approve' | 'retry' | 'resume' | 'stop' | 'invalidate' | 'sponsor' | 'withdraw';

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
    /** Exact current credential version, absent when no record is available. */
    version?: number | null;
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

/** Automatic recovery is a scheduling receipt, never permission to skip admission checks. */
export interface CredentialRecovery {
    /** Whether recorded consent and failure class permit automatic reconsideration. */
    eligible: boolean;
    /** Durable earliest retry time in Unix seconds. */
    not_before: number;
    /** Current source-validated delivery, if every required route has candidate evidence. */
    delivery?: { id: string; due_at: number };
    /** Delivery already checked; it does not represent a queued retry. */
    consumed?: string | null;
    /** Last recovery check outcome. */
    status?: string;
}

/** Authoritative charged attempts, including historical owners and credential versions. */
export interface ChargedCalls {
    /** Nonsecret ledger identity. */
    id: string;
    /** Actual funding source for these attempts. */
    kind: 'org' | 'contributed';
    /** Canonical provider derived by the service from the recorded route. */
    provider: Provider | null;
    /** Recorded model profile or harness display name. */
    profile?: string;
    /** Stable actor who paid these attempts; absent for organization funding. */
    sponsor?: string | null;
    /** Frozen route and replacement version. */
    route?: string | null;
    version?: number | null;
    /** Count already debited from the task budget. */
    calls: number;
}

/** Nonsecret daemon projection; pending source evidence must stay visibly pending. */
export interface Sponsorship {
    /** Nonwriters receive only their own consent, without task data or other sponsors. */
    scope?: 'own';
    /** Sanitized own transition receipts and withdrawal cutoffs. */
    history?: { transition?: string; provider?: string; reason?: string; cutoff?: number | null }[];

    funding?: 'org' | 'contributed' | 'mixed' | 'unknown';
    /** Confirmed payer choices for future admissions, independent of consent and historical debits. */
    provider_funding?: Partial<Record<Provider, 'org' | 'contributed'>>;
    /** Validated pending transition choices, overlaid on adopted provider funding. */
    source_provider_funding?: Partial<Record<Provider, 'org' | 'contributed'>>;
    /** Actual task stage and total attempts; absent before enrollment. */
    task_stage?: string | null;
    calls?: number;
    /** Nonsecret automatic scheduling state, distinct from provider consent. */
    recovery?: CredentialRecovery | null;
    /** Historical debits, not prospective sponsor ownership. */
    charged_calls?: ChargedCalls[];
    /** Sanitized gateway observations; absent usage stays unknown. */
    observations_status?: 'available' | 'unknown';
    /** Native log availability does not imply complete provider usage. */
    native_status?: 'available' | 'unavailable' | 'disabled' | 'unknown';
    observations?: { request: string; source?: string; completed?: boolean; category: string | null; usage: { input_tokens: number; output_tokens: number } | null; binding: { sponsorship_provider: Provider; sponsor: string; credential_version: number } }[];
    status: string;
    task_status?: string | null;
    slots: Partial<Record<Provider, SponsorSlot>>;
    /** Adopted owners overlaid with validated pending provider transitions. */
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
	/** `owner/repo` of each repository whose issues enroll here; the upstream alone when absent. */
	issueRepositories?: string[];
	description: string;
	mode: Mode;
	defaultBranch: string;
	roster: RosterEntry[];
	config: string;
	/** Model profiles the roster refers to, from the target configuration. */
	profiles?: ModelProfile[];
	credentialRequirements?: CredentialRequirement[] | null;
	/** Whether the signed-in user has write access to the upstream repository. */
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
	/** Absent on an archived generation: historical concern text, with no current ledger status. */
	resolved?: boolean;
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
	/** Empty when the engine recorded no time for this generation. */
	at: string;
	/** Why this generation was invalidated; empty for the current one. */
	reason?: string;
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

/** Independently loaded issue-page content. */
export type TaskSection = 'intake' | 'plan' | 'design' | 'implement' | 'review' | 'handoff' | 'timeline' | 'pull';

/** Freshness of data the API saved from GitHub; a list view reports its oldest list. */
export interface ReadFreshness {
	/** Time GitHub last supplied a complete verified snapshot. */
	observedAt: string;
	/** Whether the snapshot is due for refresh or its latest refresh failed. */
	stale: boolean;
	/** Whether the API is currently refreshing it. */
	refreshing: boolean;
	/** A recently posted command is awaiting its effect. */
	pendingCommand?: boolean;
	/** Public explanation of the latest failed refresh. */
	error: string | null;
	/** With the service's list index: whether it has verified that it missed no change. */
	state?: 'current' | 'catching-up' | 'unavailable';
	/** When the index last verified its lists against GitHub's delivery history. */
	verified?: string | null;
}

/** Issue summary and target configuration used by the page shell. */
export interface TaskView {
	/** Upstream writer authority for new task/provider commands. */
	issueWriter: boolean;
	/** Present when the API keeps a persistent issue snapshot. */
	cache?: ReadFreshness;
	/** Lightweight task metadata. */
	task: Task;
	/** Target metadata and model profiles. */
	target: Target;
}

export interface Task {
	/** Checkpoint and issue revision used to separate cached phase responses. */
	revision?: string;
	/** Recorded work in each step, independent of loaded phase bodies. */
	phaseRecords?: boolean[];
	/** Current approval identity, available before the plan body is fetched. */
	currentPlan?: Pick<PlanVersion, 'id'> & Partial<Pick<PlanVersion, 'version' | 'summary'>>;
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

/** One GitHub Actions run, with the task and turns the service recorded for it. */
export interface ActionsRun {
	id: number;
	/** The attempt shown: the one that served the turns, which is always 1 for an attributed run. */
	attempt?: number;
	title: string;
	/** GitHub's own run status, not a turn outcome. */
	status: 'success' | 'failure' | 'in_progress' | 'queued' | 'cancelled';
	/** `assigned` means a turn recorded this run; `dispatched` means its session was only sent here. */
	association?: 'assigned' | 'dispatched' | null;
	/** The task this run served; null when no recorded turn names it. */
	task?: { owner: string; repo: string; issue: number } | null;
	issue: number | null;
	/** The first turn the run served, for the diagnostics link. */
	turn: number | null;
	startedAt: string;
	/** Estimated elapsed time from GitHub's run timestamps, not measured job duration; 0 while running. */
	durationS: number;
}

/** `GET /api/overview`. */
export interface Overview {
	tasks: Task[];
	issues: IssueIntent[];
	targets: Target[];
	activity: ActivityItem[];
	cache?: ReadFreshness;
}

/** `GET /api/targets/{owner}/{repo}`. */
export interface TargetView {
	issues: IssueIntent[];
	target: Target;
	tasks: Task[];
	cache?: ReadFreshness;
}

/** `GET /api/targets/{owner}/{repo}/runs`; `message` says why runs are missing. */
export interface TargetRuns {
	runs: ActionsRun[];
	message: string | null;
	cache?: ReadFreshness;
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
	/** Budget attention stays separate from token replacement. */
	kind: 'plan_approval' | 'input_needed' | 'credentials' | 'budget' | 'ci_red';
	task: Task;
	text: string;
}
