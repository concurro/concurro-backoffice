import { api } from '#lib/mock/api.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({ result: api.target(params.owner, params.repo) });
