import { cached, cacheEpoch, clearTaskCache } from './cache.svelte.ts';
import { base } from '#lib/paths.ts';
import type { Command, LiveOperatorStatus, TargetConfiguration, TargetView, CredentialEntry, CredentialList, CredentialListing, CredentialPolicy, CredentialSecret, CredentialTypeId, IssueIntent, IssueRef, ModelProfile, Overview, RelayOverview, RelayPending, Report, ReviewCommand, ReviewView, Target, TargetRuns, Task, TaskSection, TaskView, Turn, TurnRuns } from '#lib/types.ts';
import { follow, type ChangeSource } from './events.ts';
import { ApiError, readModel, type ReadIndexPage, type ReadTarget, type ReadTargetConfiguration, type ReadTask, type ReadTaskDetail, type ReadTaskPage, type ReadTranscriptLine, type ReadTranscriptPage } from './read-model.ts';
import { issueFromIndex, pullFromIndex, reportArtifact, reviewFromRead, reviewSummaryFromRead, runsFromRead, sponsorshipFromRead, targetFromRead, targetConfigurationFromRead, taskFromRead, turnsFromRead } from './read-adapter.ts';
import { remember, session, type Me } from './session.svelte.ts';

export { ApiError } from './read-model.ts';

/** Writes carry this header; the backend refuses writes without it. */
const WRITE_HEADER = { 'x-concurro-request': '1' };

/** Where sign-in starts; GitHub returns to `next` (an app path). */
export const signInUrl = (next = '/') => `${base}/auth/login?next=${encodeURIComponent(next)}`;

async function request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
	const response = await fetch(base + path, {
		method,
		credentials: 'same-origin',
		headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(method === 'GET' ? {} : WRITE_HEADER), ...headers },
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

/** Page the durable task list so navigation includes tasks beyond the first page. */
async function readTasks(filter?: string): Promise<ReadTask[]> {
	const tasks: ReadTask[] = [];
	let cursor: string | null = null;
	do {
		const query = new URLSearchParams();
		if (filter) query.set('target', filter);
		if (cursor) query.set('cursor', cursor);
		const page = await readModel<ReadTaskPage>(`/tasks${query.size ? `?${query}` : ''}`);
		tasks.push(...page.tasks);
		cursor = page.next_cursor;
	} while (cursor);
	return tasks;
}

/** Page one saved GitHub list belonging to a configured target. */
async function readIndex(owner: string, repo: string, kind: 'issue' | 'pull' | 'run'): Promise<ReadIndexPage['rows']> {
	const rows: ReadIndexPage['rows'] = [];
	let cursor: string | null = null;
	do {
		const query = new URLSearchParams({ kind });
		if (cursor) query.set('cursor', cursor);
		const page = await readModel<ReadIndexPage>(`/targets/${path(owner, repo)}/index?${query}`);
		rows.push(...page.rows);
		cursor = page.next_cursor;
	} while (cursor);
	return rows;
}

/** Resolve an issue task through the stable task ID in the v2 issue response. */
async function readTaskView(owner: string, repo: string, issue: number): Promise<TaskView> {
	const page = await readModel<{ task: ReadTask | null; issue: { document?: Record<string, unknown> } }>(`/issues/${path(owner, repo, issue)}`);
	if (!page.task) throw new ApiError(404, 'This issue has no enrolled task.');
	const detail = await readModel<ReadTaskDetail>(`/tasks/${encodeURIComponent(page.task.id)}`);
	const targetPage = await readModel<{ targets: ReadTarget[] }>('/targets');
	const target = targetPage.targets.find((item) =>
		item.issue_repository.toLowerCase() === `${owner}/${repo}`.toLowerCase());
	const viewTarget = targetFromRead(target ?? {
		upstream: `${owner}/${repo}`, issue_repository: `${owner}/${repo}`, fork: ''
	});
	viewTarget.writer = detail.viewer.tier === 'writer';
	return { task: taskFromRead(detail.task, detail), target: viewTarget, issueWriter: detail.viewer.tier === 'writer' };
}

/** Preserve one signed action identity when its first response is uncertain. */
async function sendCommand(task: IssueRef, command: Command, argument?: string, review = false): Promise<string> {
	const action = crypto.randomUUID();
	const endpoint = review
		? `/api/tasks/${path(task.owner, task.repo, task.issue)}/commands`
		: `/api/repos/${path(task.owner, task.repo)}/issues/${task.issue}/commands`;
	const body = { command, argument };
	const send = () => request<{ request_id: string; status: string; reason?: string }>('POST', endpoint, body, { 'Idempotency-Key': action });
	let result;
	try {
		result = await send();
	} catch (error) {
		if (error instanceof ApiError && ![502, 503, 504].includes(error.status)) throw error;
		result = await send();
	}
	clearTaskCache();
	return result.reason ? `Command ${result.status}: ${result.reason}` : `Command ${result.status} for ${task.repo}#${task.issue}`;
}

/** Read the overview; a read that a command or account change outdated leaves the session's lists alone. */
async function readOverview(): Promise<Overview> {
	const epoch = cacheEpoch();
	const [targetPage, taskRows] = await Promise.all([
		readModel<{ targets: ReadTarget[] }>('/targets'), readTasks()
	]);
	const targets = targetPage.targets.map(targetFromRead);
	const tasks = taskRows.filter((task) => task.kind === 'contribution').map((task) => taskFromRead(task));
	const reviews = taskRows.filter((task) => task.kind === 'standalone_pr_review').map(reviewSummaryFromRead);
	const issuePages = await Promise.all(targets.map(async (target) => {
		const repository = target.issueRepositories?.[0] ?? `${target.owner}/${target.repo}`;
		return (await readIndex(target.owner, target.repo, 'issue')).map((row) => issueFromIndex(row, repository));
	}));
	const enrolled = new Set(tasks.map((task) => `${task.owner}/${task.repo}#${task.issue}`.toLowerCase()));
	const issues = issuePages.flat().filter((issue) => !enrolled.has(`${issue.owner}/${issue.repo}#${issue.issue}`.toLowerCase()));
	const result: Overview = { targets, tasks, reviews, issues, activity: [] };
	if (epoch === cacheEpoch()) remember(result);
	return result;
}

/** Follow live changes for as long as the app shell is shown. */
export const followChanges = () => follow(() => new EventSource(`${base}/api/v2/events`) as unknown as ChangeSource);

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
		return cached(`target:${path(owner, repo)}`, async (): Promise<TargetView> => {
			const source = (await readModel<{ targets: ReadTarget[] }>('/targets')).targets.find((item) =>
				[item.upstream, item.issue_repository].some((repository) =>
					repository.toLowerCase() === `${owner}/${repo}`.toLowerCase()));
			if (!source) throw new ApiError(404, 'Target is unavailable.');
			const target = targetFromRead(source);
			const [upstreamOwner, upstreamRepo] = source.upstream.split('/');
			const [taskRows, issueRows, pullRows] = await Promise.all([
				readTasks(source.upstream), readIndex(upstreamOwner, upstreamRepo, 'issue'),
				readIndex(upstreamOwner, upstreamRepo, 'pull')
			]);
			const tasks = taskRows.filter((item) => item.kind === 'contribution').map((item) => taskFromRead(item));
			const reviews = taskRows.filter((item) => item.kind === 'standalone_pr_review').map(reviewSummaryFromRead);
			const enrolled = new Set(tasks.map((item) => item.issue));
			const issues = issueRows.map((item) => issueFromIndex(item, source.issue_repository))
				.filter((item) => !enrolled.has(item.issue));
			const indexedPulls = pullRows.map(pullFromIndex)
				.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.number - a.number);
			return { target, tasks, reviews, issues, indexedPulls } satisfies TargetView;
		});
	},
    /** Read current allowlisted settings independently from target task/index loading. */
    targetConfiguration: (owner: string, repo: string) =>
        cached(`configuration:${path(owner, repo)}`, async (): Promise<TargetConfiguration> => {
            const source = await readModel<ReadTargetConfiguration>(`/targets/${path(owner, repo)}/configuration`);
            const configuration = targetConfigurationFromRead(source);
            remember({ profiles: configuration.profiles });
            return configuration;
        }),
	/** Load a target's Actions runs only when their tab is opened. */
	targetRuns: (owner: string, repo: string) =>
		cached(`runs:${path(owner, repo)}`, async (): Promise<TargetRuns> => {
			const rows = await readIndex(owner, repo, 'run');
			return { runs: runsFromRead(rows), message: null } satisfies TargetRuns;
		}),
	async task(owner: string, repo: string, issue: number): Promise<{ task: Task; target: Target; issueWriter: boolean }> {
		return readTaskView(owner, repo, issue);
	},
    /** An issue-addressed view does not need an enrolled task. */
    issue: async (owner: string, repo: string, issue: number): Promise<{ issue: IssueIntent; target?: Target; issueWriter: boolean }> => {
		const page = await readModel<{ issue: { document?: Record<string, unknown> }; task: ReadTask | null;
			consent: { entity: string; body: Record<string, unknown> }[];
			historical_turns: { deployment: string; source_id: string; stage: string; status: string }[];
			viewer: { tier: string } }>(`/issues/${path(owner, repo, issue)}`);
		const row = { item_id: String(issue), source_at: '', document: { number: issue, ...page.issue.document } };
		const source = (await readModel<{ targets: ReadTarget[] }>('/targets')).targets.find((item) =>
			[item.upstream, item.issue_repository].some((repository) => repository.toLowerCase() === `${owner}/${repo}`.toLowerCase()));
		const intent = issueFromIndex(row, `${owner}/${repo}`);
		intent.sponsorships = sponsorshipFromRead(page.consent ?? []);
		if (intent.sponsorships && page.viewer.tier !== 'writer') intent.sponsorships.scope = 'own';
		intent.historicalTurns = (page.historical_turns ?? []).map((turn) => ({
			deployment: turn.deployment, sourceId: turn.source_id, stage: turn.stage, status: turn.status
		}));
		return { issue: intent, target: source ? targetFromRead(source) : undefined,
			issueWriter: page.viewer.tier === 'writer' };
	},
	/** Summary reads survive navigation and refresh in the background when stale. */
	taskSummary(owner: string, repo: string, issue: number) {
		return cached(`task:${path(owner, repo, issue)}`, async () => {
			const result = await readTaskView(owner, repo, issue);
			remember({ profiles: result.target.profiles });
			return result;
		});
	},
	/** A standalone pull request review; follows the same task changes as an issue task. */
	review(owner: string, repo: string, pr: number) {
		return cached(`review:${path(owner, repo, pr)}`, async () => {
			const summary = (await readTasks(`${owner}/${repo}`)).find((item) =>
				item.kind === 'standalone_pr_review' && item.issue_number === pr);
			if (!summary) throw new ApiError(404, 'Review not found.');
			const detail = await readModel<ReadTaskDetail>(`/tasks/${encodeURIComponent(summary.id)}`);
			const target = (await readModel<{ targets: ReadTarget[] }>('/targets')).targets.find((item) =>
				item.upstream.toLowerCase() === `${owner}/${repo}`.toLowerCase());
			if (!target) throw new ApiError(404, 'Target is unavailable.');
			return { task: reviewFromRead(detail.task, detail), target: targetFromRead(target),
				issueWriter: detail.viewer.tier === 'writer' } satisfies ReviewView;
		});
	},
	/** A reviewer's complete report; a failed read means its stored evidence is missing or changed. */
	report: (owner: string, repo: string, number: number, id: string) =>
		cached(`report:${path(owner, repo, number)}/${encodeURIComponent(id)}`, () =>
			readTasks(`${owner}/${repo}`).then(async (tasks) => {
				const task = tasks.find((item) => item.kind === 'standalone_pr_review' && item.issue_number === number);
				if (!task) throw new ApiError(404, 'Report not found.');
				const detail = await readModel<ReadTaskDetail>(`/tasks/${encodeURIComponent(task.id)}`);
				const record = detail.records?.find((item) => item.entity === 'report'
					&& item.body.report_id === id && item.body.standalone_task_id === task.id);
				if (!record || record.body.status !== 'confirmed') throw new ApiError(404, 'Report not found.');
				const artifact = reportArtifact(record.body.body);
				const content = artifact.report as Report['content'] | undefined;
				if (!content || typeof content.summary !== 'string' || !Array.isArray(content.findings)
					|| !Array.isArray(content.dispositions)) throw new ApiError(502, 'Stored report is invalid.');
				const bytes = new TextEncoder().encode(String(record.body.body));
				const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
					.map((byte) => byte.toString(16).padStart(2, '0')).join('');
				return { report: {
					id, step: 'review', reviewer: String(artifact.reviewer ?? ''), model: '',
					round: Number(artifact.round) || null, head: String(artifact.head ?? ''),
					outcome: String(artifact.validation ?? ''), at: String(record.body.recorded_at ?? ''),
					kind: String(artifact.kind ?? 'standalone_pr_review'),
					title: String(content.headline ?? ''), details: {}, digest, artifacts: [], content
				} satisfies Report };
			})),
	/** Fetch only the selected phase, timeline or live PR data. */
	taskSection(task: Task, section: TaskSection) {
		const key = path(task.owner, task.repo, task.issue);
		return cached(`section:${key}:${section}`, async () => {
			const detail = await readModel<ReadTaskDetail>(`/tasks/${encodeURIComponent(task.id ?? '')}`);
			return { task: taskFromRead(detail.task, detail) };
		}, task.revision ?? task.updatedAt);
	},
	turns: (owner: string, repo: string, issue: number) =>
		readTaskView(owner, repo, issue).then(async (view) => {
			const detail = await readModel<ReadTaskDetail>(`/tasks/${encodeURIComponent(view.task.id ?? '')}`);
			const turns = await turnsFromRead(detail, (turn, digest) => readModel<unknown>(
				`/tasks/${encodeURIComponent(detail.task.id)}/turns/${encodeURIComponent(turn)}/artifacts/${encodeURIComponent(digest)}`));
			return { task: view.task, turns };
		}),
	/** Load a selected turn's original archive lines through the writer-scoped Rust API. */
	turnTranscript: async (taskId: string, turnId: string): Promise<ReadTranscriptLine[]> => {
		const lines: ReadTranscriptLine[] = [];
		let cursor: number | null = null;
		const imported = turnId.startsWith('import:') ? turnId.slice('import:'.length).split(':') : null;
		try {
			do {
				const source = imported && imported.length === 2
					? `/imports/${encodeURIComponent(imported[0])}/turns/${encodeURIComponent(imported[1])}`
					: `/tasks/${encodeURIComponent(taskId)}/turns/${encodeURIComponent(turnId)}`;
				const route: string = `${source}/transcript`
					+ (cursor === null ? '' : `?cursor=${cursor}`);
				const page: ReadTranscriptPage = await readModel<ReadTranscriptPage>(route);
				lines.push(...page.lines);
				cursor = page.next_cursor;
			} while (cursor !== null);
		} catch (error) {
			if (!(error instanceof ApiError && error.status === 404)) throw error;
		}
		return lines;
	},
	/** Load durable runner identities and their current indexed workflow runs. */
	turnRuns: async (owner: string, repo: string, issue: number, identifier: string): Promise<TurnRuns> => {
		const view = await readTaskView(owner, repo, issue);
		const detail = await readModel<ReadTaskDetail>(`/tasks/${encodeURIComponent(view.task.id ?? '')}`);
		const runners = Array.isArray(detail.history?.runners) ? detail.history.runners as Record<string, unknown>[] : [];
		const owned = runners.filter((runner) => runner.turn_id === identifier && runner.run_id != null);
		if (!owned.length) return { runs: [], message: 'No workflow run was recorded for this turn.' };
		const indexed = await readIndex(view.target.owner, view.target.repo, 'run');
		return {
			runs: owned.map((runner) => {
				const id = Number(runner.run_id);
				const row = indexed.find((item) => Number(item.document.id) === id);
				const source = row?.document ?? {};
				return {
					id, attempt: Number(source.run_attempt ?? 1),
					url: String(source.html_url ?? `https://github.com/${view.target.fork}/actions/runs/${id}`),
					workflow: String(source.name ?? source.workflow_id ?? ''),
					status: String(source.status ?? runner.dispatch_status ?? ''),
					conclusion: source.conclusion == null ? null : String(source.conclusion),
					session: String(runner.session_id ?? ''), association: 'dispatched' as const,
					jobs: null
				};
			}), message: indexed.length ? null : 'Workflow run details are unavailable from the current index.'
		};
	},
	/** The user's ordered lists alone. */
	credentialListing: () => request<CredentialListing>('GET', '/api/me/credentials'),
	/** The user's ordered lists, with the targets whose profiles a filter can name. */
	async credentials(): Promise<CredentialListing & { targets: Target[] }> {
		const [result, overview] = await Promise.all([
			api.credentialListing(),
			session.targets.length ? Promise.resolve({ targets: session.targets }) : readOverview()
		]);
		return { ...result, targets: overview.targets };
	},
	sponsorships: async () => {
		const page = await readModel<{ facts: { repository: string; number: number; body: Record<string, unknown> }[] }>('/me/sponsorships');
		const issues = new Map<string, IssueIntent>();
		for (const fact of page.facts) {
			const [owner, repo] = fact.repository.split('/');
			const key = `${fact.repository}#${fact.number}`;
			issues.set(key, issues.get(key) ?? {
				owner, repo, issue: fact.number, title: `Issue #${fact.number}`,
				author: '', labels: [], updatedAt: String(fact.body.source_at ?? '')
			});
		}
		return [...issues.values()];
	},
	/** Sponsor setup and live link telemetry; never cached, since connections change. */
	relays: () => request<RelayOverview>('GET', '/api/me/relays'),
	/** The device name and exact routes a displayed Sponsor code registered. */
	pendingRelay: (code: string) => request<RelayPending>('POST', '/api/me/credentials/relay/pending', { code }),
	logoutStatus: () => request<{ remote: string }>('GET', '/auth/logout-status'),
	operator: () => readModel<LiveOperatorStatus>('/operator'),
	/** Synchronous index for the command palette, from what has been loaded so far. */
	index: () => ({ targets: session.targets, tasks: session.tasks })
};

export const actions = {
	/** Sends the command; Concurro posts it on the issue as the user's command. Returns toast text. */
	async command(task: IssueRef, command: Command, arg = ''): Promise<string> {
		const argument = (['approve', 'retry', 'sponsor', 'withdraw', 'funding'].includes(command)) && arg ? arg : undefined;
		return sendCommand(task, command, argument);
	},
	/** Sends a command for a standalone review, addressed by its pull request number. Returns toast text. */
	async reviewCommand(task: IssueRef, command: ReviewCommand, arg = ''): Promise<string> {
		return sendCommand(task, command, arg || undefined, true);
	},
	addCredential: (type: CredentialTypeId, policy: CredentialPolicy, secret: CredentialSecret) =>
		mutate<CredentialEntry>('POST', '/api/me/credentials', { type, ...policy, ...secret }),
	/** Approve the Sponsor's exact selected route set. */
	addRelay: (code: string, routes: string[], policy: CredentialPolicy) =>
		mutate<{ entries: Record<string, CredentialEntry> }>('POST', '/api/me/credentials/relay', { code, routes, ...policy }),
	/** Rename, enable or refilter one entry at the revision last read; its token is untouched. */
	editCredential: (entry: CredentialEntry, changes: Partial<CredentialPolicy & { enabled: boolean }>) =>
		mutate<CredentialEntry>('PATCH', `/api/me/credentials/${entry.id}`, { revision: entry.revision, ...changes }),
	replaceCredential: (entry: CredentialEntry, secret: CredentialSecret) =>
		mutate<CredentialEntry>('PUT', `/api/me/credentials/${entry.id}/secret`, { revision: entry.revision, ...secret }),
	/** Replace a paired device's approvals, one entry per route the new code registered. */
	replaceDevice: (entries: CredentialEntry[], code: string) =>
		mutate<{ entries: Record<string, CredentialEntry> }>('PUT', '/api/me/credentials/relay/device', { code, entries: entries.map((entry) => ({ id: entry.id, revision: entry.revision })) }),
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
