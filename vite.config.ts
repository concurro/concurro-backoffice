import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

declare const process: { env: Record<string, string | undefined> };

/** The edge serves the app under `/concurro`; `CONCURRO_BASE=` (empty) serves it at the root. */
const base = (process.env.CONCURRO_BASE ?? '/concurro') as '' | `/${string}`;
/** The backoffice API for `npm run dev`, which mirrors the edge by stripping the base path. */
const backend = process.env.CONCURRO_API ?? 'http://127.0.0.1:8788';

export default defineConfig({
	plugins: [sveltekit({ adapter: adapter({ fallback: 'index.html' }), paths: { base } })],
	server: {
		proxy: Object.fromEntries(
			['/api', '/auth'].map((path) => [
				base + path,
				{ target: backend, rewrite: (url: string) => url.slice(base.length) }
			])
		)
	}
});
