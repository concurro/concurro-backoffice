import { api } from '#lib/api/index.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
	resource: api.review(params.owner, params.repo, Number(params.pr))
});
