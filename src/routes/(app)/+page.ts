import { api } from '#lib/api/index.ts';

export const load = () => ({ overview: api.overview() });
