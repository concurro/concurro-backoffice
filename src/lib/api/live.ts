import { cached, cacheEpoch, clearTaskCache } from './cache.svelte.ts';
import { base } from '#lib/paths.ts';
import type { Command, TargetView, CredentialEntry, CredentialList, CredentialListing, CredentialPolicy, CredentialSecret, CredentialTypeId, IssueIntent, IssueRef, ModelProfile, Overview, Report, ReviewCommand, ReviewView, Target, TargetRuns, Task, TaskSection, TaskView, Turn, TurnRuns } from '#lib/types.ts';
import { follow, type ChangeSource } from './events.ts';
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

/** Send a credential write under one mutation identity, repeating it once when its reply was lost. */
async function mutate<T>(method: string, path: string, body: object): Promise<T> {
	const identified = { ...body, mutation_id: crypto.randomUUID() };
	try {
		return await request<T>(method, path, identified);
	} catch (error) {
		if (error instanceof ApiError && ![502, 503, 504].includes(error.status)) throw error;
		return request<T>(method, path, identified);
	}
}

const path = (owner: string, repo: string, issue?: number) =>
	`${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` + (issue === undefined ? '' : `/${issue}`);

/** Read the overview; a read that a command or account change outdated leaves the session's lists alone. */
async function readOverview(): Promise<Overview> {
	const epoch = cacheEpoch();
	const result = await request<Overview>('GET', '/api/overview');
	if (epoch === cacheEpoch()) remember(result);
	return result;
}

/** Follow live changes for as long as the app shell is shown. */
export const followChanges = () => follow(() => new EventSource(`${base}/api/events`) as unknown as ChangeSource);

export const api = {
	async me(): Promise<Me> {
		const me = await request<Me>('GET', '/api/me');
		if (session.me.login && me.login !== session.me.login) clearTaskCache();
		session.me = me;
		return session.me;
	},
	/** List reads survive navigation and refresh in the background when stale. */
	overview: () => cached('overview', readOverview),
	target(owner: string, repo: string) {
		return cached(`target:${path(owner, repo)}`, async () => {
			const result = await request<TargetView>('GET', `/api/targets/${path(owner, repo)}`);
			remember({ profiles: result.target.profiles });
			return result;
		});
	},
	/** Load a target's Actions runs only when their tab is opened. */
	targetRuns: (owner: string, repo: string) =>
		cached(`runs:${path(owner, repo)}`, () => request<TargetRuns>('GET', `/api/targets/${path(owner, repo)}/runs`)),
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
	/** A standalone pull request review; follows the same task changes as an issue task. */
	review(owner: string, repo: string, pr: number) {
		return cached(`review:${path(owner, repo, pr)}`, async () => {
			const result = await request<ReviewView>('GET', `/api/reviews/${path(owner, repo, pr)}`);
			remember({ profiles: result.target.profiles });
			return result;
		});
	},
	/** A reviewer's complete report; a failed read means its stored evidence is missing or changed. */
	report: (owner: string, repo: string, number: number, id: string) =>
		cached(`report:${path(owner, repo, number)}/${encodeURIComponent(id)}`, () =>
			request<{ report: Report }>('GET', `/api/tasks/${path(owner, repo, number)}/reports/${encodeURIComponent(id)}`)),
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
	/** The user's ordered lists, with the targets whose profiles a filter can name. */
	async credentials(): Promise<CredentialListing & { targets: Target[] }> {
		const [result, overview] = await Promise.all([
			request<CredentialListing>('GET', '/api/me/credentials'),
			session.targets.length ? Promise.resolve({ targets: session.targets }) : readOverview()
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
		const argument = (['approve', 'retry', 'sponsor', 'withdraw', 'funding'].includes(command)) && arg ? arg : undefined;
		const result = await request<{ posted: string; actor: string }>('POST', `/api/repos/${path(task.owner, task.repo)}/issues/${task.issue}/commands`, { command, argument });
		clearTaskCache();
		return `Concurro posted ${result.posted} for @${result.actor} on ${task.repo}#${task.issue}`;
	},
	/** Sends a command for a standalone review, addressed by its pull request number. Returns toast text. */
	async reviewCommand(task: IssueRef, command: ReviewCommand, arg = ''): Promise<string> {
		const result = await request<{ posted: string; actor: string }>('POST', `/api/tasks/${path(task.owner, task.repo, task.issue)}/commands`, { command, argument: arg || undefined });
		clearTaskCache();
		return `Concurro posted ${result.posted} for @${result.actor} on ${task.repo}#${task.issue}`;
	},
	/** Have every list of a target read from GitHub again. */
	async refreshTarget(owner: string, repo: string): Promise<void> {
		await request('POST', `/api/targets/${path(owner, repo)}/refresh`);
	},
	addCredential: (type: CredentialTypeId, policy: CredentialPolicy, secret: CredentialSecret) =>
		mutate<CredentialEntry>('POST', '/api/me/credentials', { type, ...policy, ...secret }),
	/** Rename, enable or refilter one entry at the revision last read; its token is untouched. */
	editCredential: (entry: CredentialEntry, changes: Partial<CredentialPolicy & { enabled: boolean }>) =>
		mutate<CredentialEntry>('PATCH', `/api/me/credentials/${entry.id}`, { revision: entry.revision, ...changes }),
	replaceCredential: (entry: CredentialEntry, secret: CredentialSecret) =>
		mutate<CredentialEntry>('PUT', `/api/me/credentials/${entry.id}/secret`, { revision: entry.revision, ...secret }),
	/** Set one provider's exact priority order at the list revision last read. */
	reorderCredentials: (list: CredentialList, entries: string[]) =>
		mutate<CredentialList>('PUT', `/api/me/credentials/order/${list.provider}`, { revision: list.revision, entries }),
	removeCredential: (entry: CredentialEntry) =>
		request<CredentialEntry>('DELETE', `/api/me/credentials/${entry.id}?revision=${entry.revision}`),
	async signOut(): Promise<{ remote: string }> {
        const result = await request<{ remote: string }>('POST', '/auth/logout');
        clearTaskCache();
        session.me = { login: '', name: '' };
        session.targets = []; session.tasks = []; session.issues = []; session.profiles = {};
        return result;
    }
};
