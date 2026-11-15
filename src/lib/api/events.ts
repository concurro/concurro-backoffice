import { outdate } from './cache.svelte.ts';
import { concerns, type LiveChange } from './changes.ts';

/** The part of `EventSource` the app uses, so tests and mock mode can stand in for it. */
export interface ChangeSource {
	onopen: (() => void) | null;
	onerror: (() => void) | null;
	addEventListener(type: string, listener: (event: { data: string }) => void): void;
	close(): void;
	readyState: number;
}

const CLOSED = 2;
const RETRY_MS = 5_000;
const RETRY_MAX_MS = 60_000;

/** Apply one change to the cached reads: displayed ones read again, the rest when next used. */
export const apply = (change: LiveChange) => outdate(concerns(change));

/**
 * Follow the backoffice's change stream until the returned function is called.
 *
 * Changes missed while disconnected are not replayed, so every time the stream opens, the
 * first included, everything is outdated. The browser reconnects a dropped stream itself;
 * one the server refused is opened again here, less and less often.
 */
export function follow(open: () => ChangeSource): () => void {
	let source: ChangeSource | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let delay = RETRY_MS;
	let stopped = false;
	const connect = () => {
		source = open();
		source.onopen = () => {
			delay = RETRY_MS;
			apply({ kind: 'reload', repository: null, issue: null, targets: [] });
		};
		for (const type of ['change', 'reload'])
			source.addEventListener(type, (event) => {
				try {
					apply(JSON.parse(event.data) as LiveChange);
				} catch {
					// A malformed event changes nothing.
				}
			});
		source.onerror = () => {
			if (stopped || source?.readyState !== CLOSED) return;
			timer = setTimeout(connect, delay);
			delay = Math.min(delay * 2, RETRY_MAX_MS);
		};
	};
	connect();
	return () => {
		stopped = true;
		clearTimeout(timer);
		source?.close();
	};
}
