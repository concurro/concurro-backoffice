import { api } from '#lib/api/index.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({
	resource: api.report(params.owner, params.repo, Number(params.pr), params.report)
});
