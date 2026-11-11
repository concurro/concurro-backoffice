import { store } from '#lib/state/store.svelte.ts';
import type { NeedsYouItem, Target, Task } from '#lib/types.ts';
import { activity, runsFor, usage } from './account';
import { operator } from './operator';
import { ME, targets } from './reference';
import { turnsFor } from './turns';

/** Mimics network latency so skeletons are visible. */
function delay<T>(value: () => T, ms = 450): Promise<T> {
	return new Promise((resolve, reject) =>
		setTimeout(() => {
			try {
				resolve(value());
			} catch (e) {
				reject(e);
			}
		}, ms + Math.random() * 250)
	);
}

export class NotFound extends Error {}

const findTarget = (owner: string, repo: string): Target => {
	const t = targets.find((x) => x.owner === owner && x.repo === repo);
	if (!t) throw new NotFound(`Target ${owner}/${repo} is not configured in Concurro.`);
	return t;
};

const findTask = (owner: string, repo: string, issue: number): Task => {
	const t = store.tasks.find((x) => x.owner === owner && x.repo === repo && x.issue === issue);
	if (!t) throw new NotFound(`${owner}/${repo}#${issue} is not enrolled in Concurro.`);
	return t;
};

export function needsYou(tasks: Task[]): NeedsYouItem[] {
	const items: NeedsYouItem[] = [];
	for (const task of tasks) {
		if (task.stage === 'planned' && task.mode === 'manual')
			items.push({ kind: 'plan_approval', task, text: `Plan v${task.plans.at(-1)?.version} is waiting for a writer’s approval` });
		if (task.stage === 'clarify') items.push({ kind: 'input_needed', task, text: task.question ?? 'Triage asked a question' });
		if (task.paused && task.sponsor === ME) items.push({ kind: 'credentials', task, text: task.pauseReason ?? 'Paused: awaiting credentials' });
		if (task.pr?.ci === 'failing' && task.sponsor === ME)
			items.push({ kind: 'ci_red', task, text: `CI is failing on head ${task.pr.headSha}` });
	}
	return items;
}

export const api = {
	overview: () => delay(() => ({ tasks: store.tasks, targets, activity })),
	target: (owner: string, repo: string) =>
		delay(() => {
			const target = findTarget(owner, repo);
			const tasks = store.tasks.filter((t) => t.owner === owner && t.repo === repo);
			return { target, tasks, runs: runsFor(tasks.map((t) => t.issue)) };
		}),
	task: (owner: string, repo: string, issue: number) =>
		delay(() => ({ task: findTask(owner, repo, issue), target: findTarget(owner, repo) })),
	turns: (owner: string, repo: string, issue: number) =>
		delay(() => {
			const task = findTask(owner, repo, issue);
			return { task, turns: turnsFor(task) };
		}),
	credentials: () => delay(() => ({ routes: store.credentials, targets, usage })),
	sponsorships: () => delay(() => store.tasks.filter((t) => t.sponsor === ME)),
	operator: () => delay(() => operator),
	/** Synchronous index for the command palette. */
	index: () => ({ targets, tasks: store.tasks })
};
