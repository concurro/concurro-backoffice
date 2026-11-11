import { api } from '#lib/api/index.ts';

export const load = () => ({ result: api.sponsorships() });
