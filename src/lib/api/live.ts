import { cached, clearTaskCache } from './cache.svelte.ts';
import { base } from '#lib/paths.ts';
import type { ActivityItem, Command, TargetView, CredentialCandidate, CredentialRoute, CredentialRouteId, IssueIntent, IssueRef, ModelProfile, Target, Task, TaskSection, TaskView, Turn, TurnRuns, UsageRow } from '#lib/types.ts';
import { remember, session, type Me } from './session.svelte.ts';

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}

/** Writes carry this header; the backend refuses writes without it. */
const WRITE_HEADER = { 'x-concurro-request': '1' };

/** Where sign-in starts; GitHub returns to `next` (an app path). */
export const signInUrl = (next = '/') => `${base}/auth/login?next=${encodeURIComponent(next)}`;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
	const response = await fetch(base + path, {
		method,
		credentials: 'same-origin',
		headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(method === 'GET' ? {} : WRITE_HEADER) },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	if (response.status === 401) {
		clearTaskCache();
		const next = location.pathname.slice(base.length) + location.search;
		location.assign(`${base}/signin?next=${encodeURIComponent(next || '/')}`);
		throw new ApiError(401, 'Sign in with GitHub to continue.');
	}
	const payload = await response.json().catch(() => null);
	if (!response.ok) {
		const detail = payload?.detail;
		throw new ApiError(response.status, typeof detail === 'string' ? detail : `The request failed (HTTP ${response.status}).`);
	}
	return payload as T;
}

const path = (owner: string, repo: string, issue?: number) =>
	`${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` + (issue === undefined ? '' : `/${issue}`);

const OVERVIEW_SECONDS = 10;
let overviewCache: { at: number; promise: Promise<Overview> } | null = null;

interface Overview {
	tasks: Task[];
	issues: IssueIntent[];
	targets: Target[];
	activity: ActivityItem[];
}

export const api = {
	async me(): Promise<Me> {
		const me = await request<Me>('GET', '/api/me');
		if (session.me.login && me.login !== session.me.login) clearTaskCache();
		session.me = me;
		return session.me;
	},
	/** Shared for a few seconds, so the layout and the overview page make one request. */
	overview(): Promise<Overview> {
		if (!overviewCache || Date.now() - overviewCache.at > OVERVIEW_SECONDS * 1000) {
			const promise = request<Overview>('GET', '/api/overview').then((result) => {
				remember(result);
				return result;
			});
			promise.catch(() => (overviewCache = null));
			overviewCache = { at: Date.now(), promise };
		}
		return overviewCache.promise;
	},
	async target(owner: string, repo: string): Promise<TargetView> {
		const result = await request<TargetView>('GET', `/api/targets/${path(owner, repo)}`);
		remember({ profiles: result.target.profiles });
		return result;
	},
	async task(owner: string, repo: string, issue: number): Promise<{ task: Task; target: Target; issueWriter: boolean }> {
		const result = await request<{ task: Task; target: Target; issueWriter: boolean }>('GET', `/api/tasks/${path(owner, repo, issue)}`);
		remember({ profiles: result.target.profiles });
		return result;
	},
    /** An issue-addressed view does not need an enrolled task. */
    issue: (owner: string, repo: string, issue: number) => request<{ issue: IssueIntent; target?: Target; issueWriter: boolean }>('GET', `/api/repos/${path(owner, repo)}/issues/${issue}`),
	/** Summary reads survive navigation and refresh in the background when stale. */
	taskSummary(owner: string, repo: string, issue: number) {
		return cached(`task:${path(owner, repo, issue)}`, async () => {
			const result = await request<TaskView>('GET', `/api/tasks/${path(owner, repo, issue)}/sections/summary`);
			remember({ profiles: result.target.profiles });
			return result;
		});
	},
	/** Fetch only the selected phase, timeline or live PR data. */
	taskSection(task: Task, section: TaskSection) {
		const key = path(task.owner, task.repo, task.issue);
		return cached(`section:${key}:${section}`, () =>
			request<{ task: Task }>('GET', `/api/tasks/${key}/sections/${section}`), task.revision ?? task.updatedAt);
	},
	turns: (owner: string, repo: string, issue: number) =>
		request<{ task: Task; turns: Turn[]; profiles?: ModelProfile[] }>('GET', `/api/tasks/${path(owner, repo, issue)}/turns`).then((result) => {
			remember({ profiles: result.profiles });
			return result;
		}),
	/** Load jobs only when the selected turn's Runner tab is opened. */
	turnRuns: (owner: string, repo: string, issue: number, identifier: string) =>
		request<TurnRuns>('GET', `/api/tasks/${path(owner, repo, issue)}/turns/${encodeURIComponent(identifier)}/runs`),
	async credentials(): Promise<{ routes: CredentialRoute[]; targets: Target[]; usage: UsageRow[] }> {
		const [result, overview] = await Promise.all([
			request<{ routes: CredentialRoute[]; usage: UsageRow[] }>('GET', '/api/me/credentials'),
			session.targets.length ? Promise.resolve({ targets: session.targets }) : api.overview()
		]);
		return { ...result, targets: overview.targets };
	},
	sponsorships: () => request<IssueIntent[]>('GET', '/api/me/sponsorships'),
	logoutStatus: () => request<{ remote: string }>('GET', '/auth/logout-status'),
	operator: async (): Promise<never> => {
		throw new ApiError(501, 'Operator views are not available yet.');
	},
	/** Synchronous index for the command palette, from what has been loaded so far. */
	index: () => ({ targets: session.targets, tasks: session.tasks })
};

export const actions = {
	/** Sends the command; Concurro posts it on the issue as the user's command. Returns toast text. */
	async command(task: IssueRef, command: Command, arg = ''): Promise<string> {
		const argument = (['approve', 'retry', 'sponsor', 'withdraw'].includes(command)) && arg ? arg : undefined;
		const result = await request<{ posted: string; actor: string }>('POST', `/api/repos/${path(task.owner, task.repo)}/issues/${task.issue}/commands`, { command, argument });
		clearTaskCache();
		overviewCache = null;
		return `Concurro posted ${result.posted} for @${result.actor} on ${task.repo}#${task.issue}`;
	},
    async saveCredential(id: CredentialRouteId, secret: string, candidate: CredentialCandidate = {}): Promise<CredentialRoute> {
        return request<CredentialRoute>('PUT', '/api/me/credentials/' + id, { secret, ...candidate });
    },
	async revokeCredential(id: CredentialRouteId): Promise<CredentialRoute> {
		return request<CredentialRoute>('DELETE', `/api/me/credentials/${id}`);
	},
	async signOut(): Promise<{ remote: string }> {
        const result = await request<{ remote: string }>('POST', '/auth/logout');
        clearTaskCache();
        overviewCache = null;
        session.me = { login: '', name: '' };
        session.targets = []; session.tasks = []; session.profiles = {};
        return result;
    }
};
