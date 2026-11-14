import { api } from '#lib/api/index.ts';

export const load = () => ({ resource: api.overview() });
