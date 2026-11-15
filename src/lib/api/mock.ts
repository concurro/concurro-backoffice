import { cached, clearTaskCache } from './cache.svelte.ts';
import { api as fixtures, NotFound } from '#lib/mock/api.ts';
import { ME, MOCK_ACTOR_ID, profiles, users } from '#lib/mock/reference.ts';
import { revokeCredential, runCommand, runReviewCommand, saveCredential, store } from '#lib/state/store.svelte.ts';
import type { Command, CredentialCandidate, CredentialRouteId, IssueRef, Overview, Report, ReviewCommand, ReviewView, TargetRuns, TargetView, Task, TaskSection, TaskView, TurnRuns } from '#lib/types.ts';
import { apply } from './events.ts';
import { ApiError } from './live.ts';
import { remember, session } from './session.svelte.ts';

/** The original mockup: fixtures served with an artificial delay, commands applied to in-browser state. */
export const api = {
	async me() {
		const me = users.find((u) => u.login === ME)!;
		session.me = { id: MOCK_ACTOR_ID, login: me.login, name: me.name };
		remember({ profiles });
		return session.me;
	},
	/** Cache fixture lists just like live responses. */
	overview() {
		return cached<Overview>('overview', async () => {
			const result = await fixtures.overview();
			remember({ ...result, profiles });
			return result;
		});
	},
	target: (owner: string, repo: string) => cached<TargetView>(`target:${owner}/${repo}`, () => fixtures.target(owner, repo)),
	targetRuns: (owner: string, repo: string) => cached<TargetRuns>(`runs:${owner}/${repo}`, () => fixtures.targetRuns(owner, repo)),
	issue: fixtures.issue,
	logoutStatus: async () => ({ remote: 'revoked' }),
	task: fixtures.task,
	/** Exercise the same independently loaded page sections with fixture data. */
	taskSummary(owner: string, repo: string, issue: number) {
		return cached<TaskView>(`task:${owner}/${repo}/${issue}`, async () => {
			const view = await fixtures.task(owner, repo, issue);
			const t = view.task;
			return { ...view, task: { ...t, body: undefined,
				phaseRecords: [!!t.intake.length, !!t.plans.length, !!t.designReview.length, !!t.pr, !!t.rounds.length, false],
				currentPlan: t.plans.at(-1), intake: [], plans: [], designReview: [], rounds: [], findings: [], timeline: [],
				pr: t.pr ? { ...t.pr, ci: 'unknown' as const, additions: null, deletions: null } : undefined
			} };
		});
	},
	/** Cache selected fixture sections just like live responses. */
	taskSection(task: Task, section: TaskSection) {
		return cached(`section:${task.owner}/${task.repo}/${task.issue}:${section}`, async () => {
			const view = await fixtures.task(task.owner, task.repo, task.issue);
			return { task: view.task };
		}, task.updatedAt);
	},
	review: (owner: string, repo: string, pr: number) => cached<ReviewView>(`review:${owner}/${repo}/${pr}`, () => fixtures.review(owner, repo, pr)),
	/** Fail as the API does: 404 for an unknown report, a conflict when its evidence is unavailable. */
	report: (owner: string, repo: string, number: number, id: string) =>
		cached<{ report: Report }>(`report:${owner}/${repo}/${number}/${id}`, () =>
			fixtures.report(owner, repo, number, id).catch((error: Error) => {
				throw new ApiError(error instanceof NotFound ? 404 : 409, error.message);
			})),
	turns: fixtures.turns,
	/** Project the fixture's runner into the same shape as live Actions evidence. */
	async turnRuns(owner: string, repo: string, issue: number, identifier: string): Promise<TurnRuns> {
		const { turns } = await fixtures.turns(owner, repo, issue);
		const turn = turns.find((t) => String(t.n) === identifier);
		const run = turn?.run;
		if (!run?.id) return { runs: [], message: 'No Actions run identity was recorded for this turn.' };
		const url = `https://github.com/${owner}/${repo}/actions/runs/${run.id}`;
		return { message: null, runs: [{
			id: run.id, attempt: run.attempt ?? 1, url, workflow: run.workflow ?? '', status: 'completed', conclusion: 'success',
			session: `fixture-${identifier}`, association: 'assigned',
			jobs: run.jobs?.map((job, n) => ({ ...job, id: n, url, status: 'completed', conclusion: job.status, runner: run.runner, labels: [] })) ?? null
		}] };
	},
	credentials: fixtures.credentials,
	sponsorships: fixtures.sponsorships,
	operator: fixtures.operator,
	index: fixtures.index
};

/** Fixtures have no stream behind them: changes come from commands applied in the browser. */
export const followChanges = () => () => {};

export const actions = {
    /** Apply issue commands before invalidating independently loaded fixture views. */
    async command(task: IssueRef, command: Command, arg = '') {
        const message = runCommand(task, command, arg);
        clearTaskCache();
        apply({ kind: 'tasks', repository: `${task.owner}/${task.repo}`, issue: task.issue, targets: [] });
        return message;
    },
    async reviewCommand(task: IssueRef, command: ReviewCommand, arg = '') {
        const message = runReviewCommand(task, command, arg);
        clearTaskCache();
        apply({ kind: 'tasks', repository: `${task.owner}/${task.repo}`, issue: task.issue, targets: [] });
        return message;
    },
	/** Fixtures have no GitHub behind them; the views simply reload. */
	async refreshTarget(_owner: string, _repo: string) {},
	async saveCredential(id: CredentialRouteId, secret: string, candidate: CredentialCandidate = {}) {
		try { saveCredential(id, secret, candidate); }
		catch (error) { throw new ApiError(422, error instanceof Error ? error.message : 'Synthetic save failed.'); }
		return store.credentials.find((c) => c.id === id)!;
	},
	async revokeCredential(id: CredentialRouteId) {
		revokeCredential(id);
		return store.credentials.find((c) => c.id === id)!;
	},
    signOut: async () => { clearTaskCache(); return { remote: 'revoked' }; }
};
