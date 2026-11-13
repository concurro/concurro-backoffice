import { cached, clearTaskCache } from './cache.svelte.ts';
import { api as fixtures } from '#lib/mock/api.ts';
import { ME, profiles, users } from '#lib/mock/reference.ts';
import { revokeCredential, runCommand, saveCredential, store } from '#lib/state/store.svelte.ts';
import type { Command, CredentialRouteId, Task, TaskSection, TurnRuns } from '#lib/types.ts';
import { remember, session } from './session.svelte.ts';

/** The original mockup: fixtures served with an artificial delay, commands applied to in-browser state. */
export const api = {
	async me() {
		const me = users.find((u) => u.login === ME)!;
		session.me = { login: me.login, name: me.name };
		remember({ profiles });
		return session.me;
	},
	async overview() {
		const result = await fixtures.overview();
		remember({ targets: result.targets, tasks: result.tasks, profiles });
		return result;
	},
	target: fixtures.target,
	task: fixtures.task,
	/** Exercise the same independently loaded page sections with fixture data. */
	taskSummary(owner: string, repo: string, issue: number) {
		return cached(`task:${owner}/${repo}/${issue}`, async () => {
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

export const actions = {
	/** Apply fixture commands to the full task, then invalidate projected views. */
	async command(task: Task, command: Command, arg = '') {
		const view = await fixtures.task(task.owner, task.repo, task.issue);
		const message = runCommand(view.task, command, arg);
		clearTaskCache();
		return message;
	},
	async saveCredential(id: CredentialRouteId, secret: string) {
		saveCredential(id, secret);
		return store.credentials.find((c) => c.id === id)!;
	},
	async revokeCredential(id: CredentialRouteId) {
		revokeCredential(id);
		return store.credentials.find((c) => c.id === id)!;
	},
	signOut: async () => clearTaskCache()
};
