import { redirect } from '@sveltejs/kit';
import { withBase } from '#lib/paths.ts';

/** Open the owner credential list's Sponsor approval dialog. */
export function load() {
	redirect(307, withBase('/me/credentials?approveRelay=1'));
}
