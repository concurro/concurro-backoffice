/** A cached read with an independently refreshable loading/error state. */
export class Resource<T> {
	/** Last successful response, retained during background refreshes. */
	value = $state.raw<T>();
	/** Failure of the latest refresh; cached content remains available. */
	error = $state.raw<unknown>();
	/** Whether a read is scheduled or in flight. */
	loading = $state(true);
	/** Time of the last successful read. */
	updated = 0;
	private pending = false;
	private again = false;

	/** Bind the read performed by initial loading and explicit retries. */
	constructor(private readonly load: () => Promise<T>) {}

	/** Coalesce concurrent reads and schedule mutations outside reactive derivations. */
	refresh = () => {
		if (this.pending) return false;
		this.pending = true;
		queueMicrotask(async () => {
			this.loading = true;
			this.error = undefined;
			try {
				this.value = await this.load();
				this.updated = Date.now();
			} catch (error) {
				this.error = error;
			} finally {
				this.pending = false;
				this.loading = false;
				if (this.again) {
					this.again = false;
					this.refresh();
				}
			}
		});
		return true;
	};

	/** Read again now, or once more after the read in flight, whose answer may predate the reason for asking. */
	reload = () => {
		if (!this.refresh()) this.again = true;
	};
}

let epoch = 0;
/** How often the cache was cleared, so a read begun before a clear can tell its result is obsolete. */
export const cacheEpoch = () => epoch;

const entries = new Map<string, { resource: Resource<unknown>; revision?: string }>();
const FRESH_MS = 10_000;

/** Reuse fresh reads, refresh stale ones, and replace evidence from obsolete revisions. */
export function cached<T>(key: string, load: () => Promise<T>, revision?: string): Resource<T> {
	const entry = entries.get(key);
	let resource = entry?.resource as Resource<T> | undefined;
	if (!resource || entry?.revision !== revision) {
		resource = new Resource(load);
		entries.set(key, { resource, revision });
	}
	if (Date.now() - resource.updated > FRESH_MS) resource.refresh();
	return resource;
}

/** Forget cached reads after commands or account changes; old requests stay isolated. */
export function clearTaskCache(): void {
	entries.clear();
	epoch++;
}
