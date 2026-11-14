import { api } from '#lib/api/index.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => ({ resource: api.target(params.owner, params.repo) });
