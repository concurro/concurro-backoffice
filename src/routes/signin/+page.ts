import type { PageLoad } from './$types';

/** `next` is the app path to return to; `error` explains a failed sign-in. */
export const load: PageLoad = ({ url }) => ({
	next: url.searchParams.get('next') ?? '/',
	error: url.searchParams.get('error')
});
