import { store } from '#lib/state/store.svelte.ts';
import type { ReviewTask, Target, Task } from '#lib/types.ts';
import { activity, runsFor, usage } from './account';
import { operator } from './operator';
import { MOCK_ACTOR_ID, targets } from './reference';
import { reportsFor, reviewSummary } from './reviews';
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

const findReview = (owner: string, repo: string, pr: number): ReviewTask => {
	const t = store.reviews.find((x) => x.owner === owner && x.repo === repo && x.pr === pr);
	if (!t) throw new NotFound(`${owner}/${repo}#${pr} has no pull request review in Concurro.`);
	return t;
};

export const api = {
	overview: () => delay(() => ({ tasks: store.tasks, issues: store.issues, reviews: store.reviews.map(reviewSummary), targets, activity })),
	target: (owner: string, repo: string) =>
		delay(() => {
			const target = findTarget(owner, repo);
			const tasks = store.tasks.filter((t) => t.owner === owner && t.repo === repo);
			const reviews = store.reviews.filter((t) => t.owner === owner && t.repo === repo).map(reviewSummary);
			return { target, tasks, reviews, issues: store.issues.filter((i) => i.owner === owner && i.repo === repo) };
		}),
	targetRuns: (owner: string, repo: string) =>
		delay(() => {
			const issues = store.tasks.filter((t) => t.owner === owner && t.repo === repo).map((t) => t.issue);
			return { runs: runsFor(findTarget(owner, repo), issues), message: null };
		}),
	task: (owner: string, repo: string, issue: number) =>
		delay(() => ({ task: findTask(owner, repo, issue), target: findTarget(owner, repo), issueWriter: true })),
	review: (owner: string, repo: string, pr: number) =>
		delay(() => ({ task: findReview(owner, repo, pr), target: findTarget(owner, repo), issueWriter: true })),
	/** A report the review lists without stored content stands for missing or changed evidence. */
	report: (owner: string, repo: string, pr: number, id: string) =>
		delay(() => {
			const task = findReview(owner, repo, pr);
			if (!task.reports.some((r) => r.id === id)) throw new NotFound(`${owner}/${repo}#${pr} has no report ${id}.`);
			const report = reportsFor(task).find((r) => r.id === id);
			if (!report) throw new Error(`The stored evidence for report ${id} no longer matches its recorded digest.`);
			return { report };
		}),
    issue: (owner: string, repo: string, issue: number) => delay(() => {
        const item = [...store.tasks, ...store.issues].find((t) => t.owner === owner && t.repo === repo && t.issue === issue);
        if (!item) throw new NotFound('Issue is not visible.');
        return { issue: item, target: findTarget(owner, repo), issueWriter: true };
    }),
	turns: (owner: string, repo: string, issue: number) =>
		delay(() => {
			const task = findTask(owner, repo, issue);
			return { task, turns: turnsFor(task) };
		}),
	credentials: () => delay(() => ({ routes: store.credentials, targets, usage })),
	sponsorships: () => delay(() => [...store.tasks, ...store.issues].filter((t) => Object.values(t.sponsorships?.slots ?? {}).some((s) => s?.sponsor_id === String(MOCK_ACTOR_ID)) || t.sponsorships?.facts?.some((f) => f.actor_id === String(MOCK_ACTOR_ID)))),
	operator: () => delay(() => operator),
	/** Synchronous index for the command palette. */
	index: () => ({ targets, tasks: store.tasks })
};
