import type { CredentialEntry, CredentialListing, IssueIntent, RelayOverview } from '#lib/types.ts';

/** Vault route of a subscription entry, which relay approvals and usage records name. */
export const entryRoute = (entry: CredentialEntry) =>
	entry.type === 'claude_subscription' ? 'claude-subscription' : entry.type === 'chatgpt_subscription' ? 'chatgpt-subscription' : null;

/** Relay routes in display order. */
export const ROUTES = ['claude-subscription', 'chatgpt-subscription'];

/** Short provider name of a relay route. */
export const routeName = (route: string) => ({ 'claude-subscription': 'Claude', 'chatgpt-subscription': 'ChatGPT' })[route] ?? route;

/** Route names in display order, such as "Claude and ChatGPT". */
export const routeList = (routes: string[]) =>
	routes.toSorted((a, b) => ROUTES.indexOf(a) - ROUTES.indexOf(b)).map(routeName).join(' and ');

/** One Sponsor device: the relay entries whose current version it is approved for. */
export interface RelayDevice {
	relay: string;
	name: string;
	/** Claude first, then ChatGPT. */
	entries: CredentialEntry[];
}

/** The owner's relay entries grouped by device, in first-listed order. */
export function relayDevices(listing: CredentialListing): RelayDevice[] {
	const devices = new Map<string, CredentialEntry[]>();
	for (const entry of listing.providers.flatMap((list) => list.entries)) {
		if (entry.custody === 'relay' && entry.relay) devices.set(entry.relay, [...(devices.get(entry.relay) ?? []), entry]);
	}
	return [...devices].map(([relay, entries]) => ({
		relay,
		name: [...new Set(entries.map((entry) => entry.name))].join(' / '),
		entries: entries.toSorted((a, b) => ROUTES.indexOf(entryRoute(a) ?? '') - ROUTES.indexOf(entryRoute(b) ?? ''))
	}));
}

/** What is known of a device's live links; an approval alone is never `online`. */
export type Connection =
	| { state: 'online'; free: number; total: number }
	| { state: 'offline'; since: string }
	| { state: 'unseen'; since: string | null }
	| { state: 'unknown'; reason: 'loading' | 'unavailable' | 'unconfigured' };

export function connection(relay: string, overview: RelayOverview | null): Connection {
	if (!overview) return { state: 'unknown', reason: 'loading' };
	if (overview.service !== 'available') return { state: 'unknown', reason: overview.service };
	const live = overview.relays.find((item) => item.relay === relay);
	if (live && (live.idle > 0 || live.active.length)) return { state: 'online', free: live.idle, total: live.idle + live.active.length };
	if (live?.lastSeen) return { state: 'offline', since: live.lastSeen };
	return { state: 'unseen', since: overview.started ?? null };
}

/** Which device entries a new code's routes replace, routes the device lacks, and entries left as they are. */
export function replacement(device: RelayDevice, routes: string[]) {
	const entries = device.entries.filter((entry) => routes.includes(entryRoute(entry) ?? ''));
	return {
		entries,
		missing: routes.filter((route) => !device.entries.some((entry) => entryRoute(entry) === route)),
		kept: device.entries.filter((entry) => !routes.includes(entryRoute(entry) ?? ''))
	};
}

/** Whether the evidence behind a figure is complete, missing for some tasks, or missing for all of them. */
export type Completeness = 'complete' | 'partial' | 'unavailable';

/** A device's own funding evidence: Concurro's charged-call ledger and the provider's usage reports, kept apart. */
export interface DeviceUsage {
	charged: { issue: IssueIntent; calls: number }[];
	/** Charged-call ledger coverage; own-scope or missing projections omit it. */
	ledger: Completeness;
	/** Tokens from provider responses; what the provider reports, not a bill. */
	reported: { requests: number; input: number; output: number };
	/** Recorded failure categories with counts. */
	failures: { category: string; count: number }[];
	/** Coverage of provider reports and failures; absent observations or unavailable/unknown native logs make it incomplete. */
	reports: Completeness;
}

const coverage = (missing: number, total: number, partial: boolean): Completeness =>
	total && missing === total ? 'unavailable' : missing || partial ? 'partial' : 'complete';

/** Match readable task evidence to the exact route and version of each of the device's current approvals. */
export function deviceUsage(device: RelayDevice, issues: IssueIntent[], me: string): DeviceUsage {
	const approved = (route?: string | null, version?: number | null) =>
		device.entries.some((entry) => entryRoute(entry) === route && entry.version === version);
	const usage: DeviceUsage = { charged: [], ledger: 'complete', reported: { requests: 0, input: 0, output: 0 }, failures: [], reports: 'complete' };
	const failures = new Map<string, number>();
	let noLedger = 0;
	let noReports = 0;
	let partialReports = false;
	for (const issue of issues) {
		const projection = issue.sponsorships;
		const own = !projection || projection.scope === 'own';
		if (own || !Array.isArray(projection.charged_calls)) noLedger += 1;
		else {
			const calls = projection.charged_calls
				.filter((row) => row.kind === 'contributed' && row.sponsor === me && approved(row.route, row.version))
				.reduce((sum, row) => sum + row.calls, 0);
			if (calls) usage.charged.push({ issue, calls });
		}
		// Observations are evidence only when present as a list; native logs must not be known missing.
		if (own || projection.observations_status === 'unknown' || !Array.isArray(projection.observations)) {
			noReports += 1;
			continue;
		}
		if (projection.native_status === 'unavailable' || projection.native_status === 'unknown') partialReports = true;
		for (const event of projection.observations) {
			if (event.binding.sponsor !== me || !approved(event.binding.route, event.binding.credential_version)) continue;
			if (event.source === 'provider' && event.usage) {
				usage.reported.requests += 1;
				usage.reported.input += event.usage.input_tokens;
				usage.reported.output += event.usage.output_tokens;
			} else if (event.source === 'provider' && event.completed) partialReports = true;
			if (event.category) failures.set(event.category, (failures.get(event.category) ?? 0) + 1);
		}
	}
	usage.failures = [...failures].map(([category, count]) => ({ category, count }));
	usage.ledger = coverage(noLedger, issues.length, false);
	usage.reports = coverage(noReports, issues.length, partialReports);
	return usage;
}

/** Usage evidence as last read; a failed read keeps the earlier result and can be retried. */
export interface UsageRead {
	issues: IssueIntent[] | null;
	failed: boolean;
}

/** Read usage evidence again, keeping `previous` results when the read fails. */
export async function readUsage(read: () => Promise<IssueIntent[]>, previous: UsageRead): Promise<UsageRead> {
	try {
		return { issues: await read(), failed: false };
	} catch {
		return { issues: previous.issues, failed: true };
	}
}
