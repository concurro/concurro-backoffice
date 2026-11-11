import { api } from '#lib/mock/api.ts';

export const load = () => ({ overview: api.overview() });
