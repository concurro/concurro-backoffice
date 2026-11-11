import { api } from '#lib/api/index.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
	result: api.task(params.owner, params.repo, Number(params.issue))
});
