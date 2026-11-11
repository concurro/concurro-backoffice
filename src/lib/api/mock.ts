import { api as fixtures } from '#lib/mock/api.ts';
import { ME, profiles, users } from '#lib/mock/reference.ts';
import { revokeCredential, runCommand, saveCredential, store } from '#lib/state/store.svelte.ts';
import type { Command, CredentialRouteId, Task } from '#lib/types.ts';
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
	turns: fixtures.turns,
	credentials: fixtures.credentials,
	sponsorships: fixtures.sponsorships,
	operator: fixtures.operator,
	index: fixtures.index
};

export const actions = {
	command: async (task: Task, command: Command, arg = '') => runCommand(task, command, arg),
	async saveCredential(id: CredentialRouteId, secret: string) {
		saveCredential(id, secret);
		return store.credentials.find((c) => c.id === id)!;
	},
	async revokeCredential(id: CredentialRouteId) {
		revokeCredential(id);
		return store.credentials.find((c) => c.id === id)!;
	},
	signOut: async () => undefined
};
