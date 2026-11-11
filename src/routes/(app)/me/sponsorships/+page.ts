import { api } from '#lib/mock/api.ts';

export const load = () => ({ result: api.sponsorships() });
