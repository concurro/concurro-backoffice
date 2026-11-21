import type { Mode, ModelProfile, RosterEntry } from '#lib/types.ts';
import { base } from '#lib/paths.ts';
import { MOCK } from './mode.ts';
import { tasks as mockTasks } from '#lib/mock/tasks.ts';

/** HTTP failure with the status needed by route-level recovery. */
export class ApiError extends Error {
	constructor(readonly status: number, message: string) { super(message); }
}

/** One viewer-safe summary from the Rust read model. */
export interface ReadTask {
	id: string;
	kind: 'contribution' | 'standalone_pr_review';
	repository_id: number;
	repository: string;
	issue_number: number;
	stage: string;
	title?: string | null;
	author?: string | null;
	updated_at?: string | null;
	plan_id?: string | null;
	reason: string | null;
	mode: string;
	pull_request: string | null;
	revision: number;
}

/** One page of source-ordered task summaries. */
export interface ReadTaskPage {
	tasks: ReadTask[];
	next_cursor: string | null;
	revision: number;
}

/** Issue-scoped response; private records appear only for a writer. */
export interface ReadTaskDetail {
	task: ReadTask;
	records?: { entity: string; body: Record<string, unknown> }[];
	/** Writer-scoped durable source history returned by the task service. */
	history?: Record<string, unknown>;
	own_consent?: Record<string, unknown>[];
	viewer: { id: number; login: string; tier: 'writer' | 'reader'; checked_at: string };
	revision: number;
}

/** One writer-visible configured target. */
export interface ReadTarget {
	upstream: string;
	issue_repository: string;
	fork: string;
}

/** Allowlisted current settings read at an exact fork commit. */
export interface ReadTargetConfiguration {
    mode: Mode;
    default_branch: string;
    roster: RosterEntry[];
    profiles: ModelProfile[];
    settings: Record<string, unknown>;
    source: { repository: string; branch: string; sha: string };
}

/** One durable GitHub list row from the task service. */
export interface ReadIndexRow {
	item_id: string;
	source_at: string;
	document: Record<string, unknown>;
}

/** One page of a target's issue, PR or run list. */
export interface ReadIndexPage {
	rows: ReadIndexRow[];
	next_cursor: string | null;
}

/** One original archive line, preserved with its source location. */
export interface ReadTranscriptLine {
	position: number;
	member_path: string;
	line_number: number;
	harness: string;
	kind: string | null;
	json: unknown;
	fallback_base64: string | null;
	diagnostic: string | null;
}

/** One page of original archive lines. */
export interface ReadTranscriptPage {
	lines: ReadTranscriptLine[];
	next_cursor: number | null;
}

/** Read one authenticated page from the separate Rust API. */
export async function readModel<T>(path: string): Promise<T> {
	if (MOCK) {
		if (path === '/me/sponsorships') return { facts: [], revision: 1 } as T;
		if (path === '/targets') return { targets: [] } as T;
		if (path.startsWith('/targets/') && path.includes('/index?')) return { rows: [], next_cursor: null } as T;
		const tasks: ReadTask[] = mockTasks.map((task, index) => ({
			id: `mock-${index}`,
			kind: 'contribution',
			repository_id: index,
			repository: `${task.owner}/${task.repo}`,
			issue_number: task.issue,
			stage: task.stage,
			reason: null,
			mode: task.mode,
			pull_request: task.pr ? `https://github.com/${task.owner}/${task.repo}/pull/${task.pr.number}` : null,
			revision: index + 1
		}));
		if (path === '/tasks') return { tasks, next_cursor: null, revision: 1 } as T;
		const task = tasks.find((item) => path === `/tasks/${item.id}`);
		if (task) return { task, records: [], viewer: { id: 1, login: 'demo', tier: 'writer', checked_at: new Date().toISOString() }, revision: 1 } as T;
		throw new Error('Mock read model item was not found.');
	}
	const response = await fetch(`${base}/api/v2${path}`, { credentials: 'same-origin' });
	if (response.status === 401) {
		location.assign(`${base}/signin?next=${encodeURIComponent(location.pathname.slice(base.length) || '/')}`);
		throw new Error('Sign in with GitHub to continue.');
	}
	const payload = await response.json().catch(() => null);
	if (!response.ok) throw new ApiError(response.status, payload?.error ?? `The read API failed (HTTP ${response.status}).`);
	return payload as T;
}

/** Follow the durable model revision; a reconnect also refreshes the displayed view. */
export function followReadModel(refresh: () => void): () => void {
	if (MOCK) return () => {};
	const source = new EventSource(`${base}/api/v2/events`);
	source.onopen = refresh;
	source.addEventListener('change', refresh);
	return () => source.close();
}
