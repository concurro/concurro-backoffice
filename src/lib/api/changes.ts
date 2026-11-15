/** A change the backoffice relays from Concurro: a list or a task's progress changed, or everything may have. */
export interface LiveChange {
	/** `state`: how current Concurro's lists of the repository are changed, not their content. */
	kind: 'tasks' | 'issues' | 'pulls' | 'runs' | 'sponsorships' | 'state' | 'reload';
	/** The repository that changed; null when everything may have. */
	repository: string | null;
	issue: number | null;
	/** The target pages concerned, as `owner/repo` of their upstream. */
	targets: string[];
}

const slug = (repository: string) => repository.split('/').map(encodeURIComponent).join('/');

/** Which cached reads (by the keys `live.ts` gives them) a change outdates. */
export function concerns(change: LiveChange): (key: string) => boolean {
	if (change.kind === 'reload') return () => true;
	const keys = new Set<string>();
	if (change.kind === 'runs' || change.kind === 'state') for (const target of change.targets) keys.add(`runs:${slug(target)}`);
	if (change.kind !== 'runs') {
		keys.add('overview');
		if (change.kind === 'tasks') {
			if (change.repository && change.issue !== null) keys.add(`task:${slug(change.repository)}/${change.issue}`);
		} else for (const target of change.targets) keys.add(`target:${slug(target)}`);
	}
	return (key) => keys.has(key);
}
