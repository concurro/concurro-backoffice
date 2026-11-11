import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Opens the most recent turn; a task without turns falls through to the empty state. */
export const load: PageLoad = async ({ parent, url }) => {
	const { result } = await parent();
	const turns = await result.then((r) => r.turns).catch(() => []);
	if (turns.length) redirect(307, `${url.pathname.replace(/\/$/, '')}/${turns.length}`);
};
