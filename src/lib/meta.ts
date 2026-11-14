import {
	Ban,
	Check,
	CircleAlert,
	CircleCheck,
	CircleDashed,
	CircleQuestionMark,
	CircleSlash,
	CircleStop,
	CircleX,
	Clock,
	GitMerge,
	GitPullRequest,
	Hammer,
	Hourglass,
	type Icon,
	Inbox,
	Info,
	Lightbulb,
	Loader,
	MessageCircleQuestionMark,
	OctagonAlert,
	PencilLine,
	PowerOff,
	RotateCcw,
	ScanSearch,
	TimerOff,
	TriangleAlert,
	Undo2,
	Unplug,
	Upload,
	X
} from 'lucide-svelte';
import type {
	AlertTone,
	CiStatus,
	CredentialStatus,
	FindingStatus,
	Role,
	Stage,
	Target,
	Task,
	Tone,
	TurnOutcome,
	Verdict
} from './types';

export type IconType = typeof Icon;
export interface Meta {
	label: string;
	tone: Tone;
	icon: IconType;
}

const m = (label: string, tone: Tone, icon: IconType): Meta => ({ label, tone, icon });

export const stageMeta: Record<Stage, Meta> = {
	intake: m('Intake', 'info', Inbox),
	clarify: m('Input needed', 'warning', MessageCircleQuestionMark),
	plan: m('Planning', 'info', PencilLine),
	plan_qc: m('Design review', 'info', ScanSearch),
	planned: m('Awaiting approval', 'warning', Hourglass),
	implement: m('Implementing', 'info', Hammer),
	publish: m('Publishing', 'info', Upload),
	review: m('PR review', 'info', GitPullRequest),
	gates: m('Ready for humans', 'success', CircleCheck),
	/** Legacy: set only by older engines; current engines record every human merge as `observed_merged`. */
	merged: m('Merged', 'accent', GitMerge),
	observed_merged: m('Merged', 'accent', GitMerge),
	closed: m('Closed', 'neutral', CircleSlash),
	awaiting_credentials: m('Awaiting credentials', 'warning', OctagonAlert),
	budget_exhausted: m('Budget exhausted', 'warning', OctagonAlert),
	blocked: m('Blocked', 'danger', OctagonAlert),
	stopped: m('Stopped', 'neutral', CircleStop),
	rejected: m('Rejected', 'neutral', Ban),
	escalated: m('Escalated', 'danger', TriangleAlert)
};

export const outcomeMeta: Record<TurnOutcome, Meta> = {
	ok: m('ok', 'success', Check),
	failed: m('failed', 'danger', X),
	uncertain: m('uncertain', 'warning', CircleQuestionMark),
	lost: m('lost', 'danger', Unplug),
	timed_out: m('timed_out', 'danger', TimerOff),
	terminated: m('terminated', 'danger', PowerOff),
	queue_expired: m('queue_expired', 'warning', Hourglass)
};

export const ciMeta: Record<CiStatus, Meta> = {
	passing: m('CI passing', 'success', CircleCheck),
	failing: m('CI failing', 'danger', CircleX),
	pending: m('CI pending', 'warning', Loader),
	none: m('No CI', 'neutral', CircleDashed),
	unknown: m('CI unavailable', 'neutral', CircleDashed)
};

export const verdictMeta: Record<Verdict, Meta> = {
	proceed: m('Proceed', 'success', Check),
	approve: m('Approve', 'success', Check),
	changes_requested: m('Changes requested', 'warning', CircleAlert),
	reopen: m('Reopen design', 'danger', RotateCcw),
	revise: m('Revise', 'warning', PencilLine),
	clarify: m('Clarify', 'warning', MessageCircleQuestionMark),
	reject: m('Reject', 'neutral', Ban),
	escalate: m('Escalate', 'danger', TriangleAlert),
	pending: m('Pending', 'neutral', Clock)
};

export const findingMeta: Record<FindingStatus, Meta> = {
	open: m('Open', 'warning', CircleAlert),
	fixed: m('Fixed', 'success', Check),
	obsolete: m('Obsolete', 'neutral', CircleSlash),
	withdrawn: m('Withdrawn', 'info', Undo2)
};

export const credentialMeta: Record<CredentialStatus, Meta> = {
	invalid: { label: 'Invalid', tone: 'danger', icon: CircleX },
	valid: m('Valid', 'success', CircleCheck),
	expired: m('Expired', 'warning', Clock),
	exhausted: m('Exhausted', 'danger', CircleAlert),
	revoked: m('Revoked', 'neutral', Ban),
	missing: m('Not configured', 'neutral', CircleDashed)
};

export const alertMeta: Record<AlertTone, Meta> = {
	note: m('Note', 'info', Info),
	tip: m('Tip', 'success', Lightbulb),
	warning: m('Warning', 'warning', TriangleAlert),
	caution: m('Caution', 'danger', OctagonAlert)
};

export const roleLabel: Record<Role, string> = {
	triage: 'Triage',
	planner: 'Planner',
	plan_reviewer: 'Plan reviewer',
	implementer: 'Implementer',
	pr_reviewer: 'PR reviewer'
};

/** Confirmed merges, including merges observed outside Concurro (engine `MERGED_STAGES`). */
export const MERGED_STAGES: Stage[] = ['merged', 'observed_merged'];
export const isMerged = (stage: Stage) => MERGED_STAGES.includes(stage);

/** A human merged the PR before Concurro handed it off, so its reviews and CI checks had not all passed. */
export const mergedEarly = (task: Task) => task.stage === 'observed_merged' && task.completion?.handedOff === false;
export const mergedEarlyMeta = m('Merged early', 'warning', GitMerge);

/** Paused tasks remain visible in parked totals and filters in both API and mock mode. */
export const PARKED_STAGES: Stage[] = ['blocked', 'escalated', 'stopped', 'awaiting_credentials', 'budget_exhausted'];

/** Canonical live stage wins; a legacy blocked summary may use the newer task projection. */
export function taskStage(task: Task): Stage {
    if (task.stage !== 'blocked') return task.stage;
    const pause = task.sponsorships?.task_stage ?? task.paused;
    return pause === 'awaiting_credentials' || pause === 'budget_exhausted' ? pause : task.stage;
}

/** The stage badge for a task, distinguishing merges that skipped handoff. */
export const taskStageMeta = (task: Task): Meta => (mergedEarly(task) ? mergedEarlyMeta : stageMeta[taskStage(task)]);

/** Pipeline steps shown in the stage stepper, and which stages belong to each. */
export const steps: { key: string; label: string; stages: Stage[] }[] = [
	{ key: 'intake', label: 'Intake', stages: ['intake', 'clarify'] },
	{ key: 'plan', label: 'Plan', stages: ['plan'] },
	{ key: 'design', label: 'Design review', stages: ['plan_qc', 'planned'] },
	{ key: 'implement', label: 'Implement', stages: ['implement', 'publish'] },
	{ key: 'review', label: 'PR review', stages: ['review'] },
	{ key: 'handoff', label: 'Handoff', stages: ['gates', ...MERGED_STAGES] }
];

export const stepIndex = (stage: Stage) => steps.findIndex((s) => s.stages.includes(stage));

/** Whether a step has recorded work, e.g. from a run that a revision or reassessment later superseded. */
export const stepHasRecord = (task: Task, i: number): boolean =>
	task.phaseRecords?.[i] ?? ([task.intake.length, task.plans.length, task.designReview.length, task.pr ? 1 : 0, task.rounds.length, 0][i] > 0);

/** Fixed and obsolete findings are resolved; open and withdrawn ones block the merge whatever their severity. */
export const isResolved = (status: FindingStatus) => status === 'fixed' || status === 'obsolete';
export const openFindings = (findings: { status: FindingStatus }[]) => findings.filter((f) => !isResolved(f.status)).length;

/** Repositories whose issues enroll in a target, as `owner/repo`. */
export const issueRepositories = (target: Target) => target.issueRepositories ?? [`${target.owner}/${target.repo}`];

/** Whether a task or issue belongs to a target. */
export const inTarget = (target: Target) => (item: { owner: string; repo: string }) =>
	issueRepositories(target).includes(`${item.owner}/${item.repo}`);
