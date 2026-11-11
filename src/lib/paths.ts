import { resolve } from '$app/paths';

/** The deployment's base path (`/concurro`), or '' at the root. */
export const base = resolve('/signin').slice(0, -'/signin'.length);

/** An app path (`/tasks/…`) as a link under the base path. */
export const withBase = (path: string) => base + path;

/** The app path of a location pathname, without the base path. */
export const appPath = (pathname: string) => (base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname);
