import { session } from '#lib/api/session.svelte.ts';
import type { NeedsYouItem, Task } from '#lib/types.ts';

/** Tasks waiting on a person: plan approvals, questions, and the signed-in user's sponsored tasks. */
export function needsYou(tasks: Task[]): NeedsYouItem[] {
	const me = session.me.login;
	const items: NeedsYouItem[] = [];
	for (const task of tasks) {
		const plan = task.plans.at(-1);
		if (task.stage === 'planned' && task.mode === 'manual')
			items.push({ kind: 'plan_approval', task, text: plan ? `Plan v${plan.version} is waiting for a writer’s approval` : 'A plan is waiting for a writer’s approval' });
		if (task.stage === 'clarify') items.push({ kind: 'input_needed', task, text: task.question ?? 'Triage asked a question' });
		if (task.paused && task.sponsor === me) items.push({ kind: 'credentials', task, text: task.pauseReason ?? 'Paused: awaiting credentials' });
		if (task.pr?.ci === 'failing' && task.sponsor === me) items.push({ kind: 'ci_red', task, text: `CI is failing on head ${task.pr.headSha}` });
	}
	return items;
}
