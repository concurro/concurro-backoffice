import type { IssueIntent, ModelProfile, Target, Task } from '#lib/types.ts';

export interface Me {
	id?: number;
	login: string;
	name: string;
	avatarUrl?: string;
}

/** What the app has learned so far: the signed-in user, model profiles, and the overview's lists for navigation. */
export const session = $state<{ me: Me; profiles: Record<string, ModelProfile>; targets: Target[]; tasks: Task[]; issues: IssueIntent[] }>({
	me: { login: '', name: '' },
	profiles: {},
	targets: [],
	tasks: [],
	issues: []
});

export function remember(data: { targets?: Target[]; tasks?: Task[]; issues?: IssueIntent[]; profiles?: ModelProfile[] }) {
	if (data.targets) {
		session.targets = data.targets;
		for (const t of data.targets) for (const p of t.profiles ?? []) session.profiles[p.name] = p;
	}
	if (data.tasks) session.tasks = data.tasks;
	if (data.issues) session.issues = data.issues;
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
