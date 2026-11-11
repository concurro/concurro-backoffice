import { api } from '#lib/api/index.ts';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ params }) => ({
	result: api.turns(params.owner, params.repo, Number(params.issue))
});
