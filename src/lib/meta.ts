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
	none: m('No CI', 'neutral', CircleDashed)
};

export const verdictMeta: Record<Verdict, Meta> = {
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

/** The stage badge for a task, distinguishing merges that skipped handoff. */
export const taskStageMeta = (task: Task): Meta => (mergedEarly(task) ? mergedEarlyMeta : stageMeta[task.stage]);

/** Pipeline steps shown in the stage stepper, and which stages belong to each. */
export const steps: { label: string; stages: Stage[] }[] = [
	{ label: 'Intake', stages: ['intake', 'clarify'] },
	{ label: 'Plan', stages: ['plan'] },
	{ label: 'Design review', stages: ['plan_qc', 'planned'] },
	{ label: 'Implement', stages: ['implement', 'publish'] },
	{ label: 'PR review', stages: ['review'] },
	{ label: 'Handoff', stages: ['gates', ...MERGED_STAGES] }
];

export const stepIndex = (stage: Stage) => steps.findIndex((s) => s.stages.includes(stage));

/** Fixed and obsolete findings are resolved; open and withdrawn ones block the merge whatever their severity. */
export const isResolved = (status: FindingStatus) => status === 'fixed' || status === 'obsolete';
export const openFindings = (findings: { status: FindingStatus }[]) => findings.filter((f) => !isResolved(f.status)).length;
