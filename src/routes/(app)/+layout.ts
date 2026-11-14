import { api } from '#lib/api/index.ts';

/** Every app page needs the signed-in user; navigation also shows the targets they can see. */
export const load = async () => {
	await api.me();
	api.overview();
	return {};
};
