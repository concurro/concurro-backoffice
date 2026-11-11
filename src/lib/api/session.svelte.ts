import type { ModelProfile, Target, Task } from '#lib/types.ts';

export interface Me {
	login: string;
	name: string;
	avatarUrl?: string;
}

/** What the app has learned so far: the signed-in user, model profiles, and targets/tasks for navigation. */
export const session = $state<{ me: Me; profiles: Record<string, ModelProfile>; targets: Target[]; tasks: Task[] }>({
	me: { login: '', name: '' },
	profiles: {},
	targets: [],
	tasks: []
});

export function remember(data: { targets?: Target[]; tasks?: Task[]; profiles?: ModelProfile[] }) {
	if (data.targets) {
		session.targets = data.targets;
		for (const t of data.targets) for (const p of t.profiles ?? []) session.profiles[p.name] = p;
	}
	if (data.tasks) session.tasks = data.tasks;
	for (const p of data.profiles ?? []) session.profiles[p.name] = p;
}

/** A model profile by name; unknown names get a profile derived from the name itself. */
export function profile(name: string): ModelProfile {
	return (
		session.profiles[name] ?? {
			name,
			provider: /claude|opus|sonnet|haiku|anthropic/i.test(name) ? 'anthropic' : 'openai',
			model: name,
			effort: ''
		}
	);
}
