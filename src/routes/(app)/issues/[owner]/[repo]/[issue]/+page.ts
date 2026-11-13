import { api } from '#lib/api/index.ts';
/** Read a visible issue independently of task enrollment. */
export const load = ({ params }: { params: { owner: string; repo: string; issue: string } }) => ({ result: api.issue(params.owner, params.repo, Number(params.issue)) });
