import { api } from '#lib/mock/api.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
	result: api.task(params.owner, params.repo, Number(params.issue))
});
