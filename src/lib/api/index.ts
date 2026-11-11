import * as live from './live.ts';
import * as mock from './mock.ts';
import { MOCK } from './mode.ts';

export { MOCK } from './mode.ts';
export { profile, session } from './session.svelte.ts';
export { ApiError, signInUrl } from './live.ts';

/** Data for route `load` functions: the backend API, or fixtures in mock mode. */
export const api = MOCK ? mock.api : live.api;
/** Writes: commands and credentials. */
export const actions = MOCK ? mock.actions : live.actions;
