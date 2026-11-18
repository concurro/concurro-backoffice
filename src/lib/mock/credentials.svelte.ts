import type { CredentialEntry, CredentialListing, CredentialPolicy, CredentialSecret, CredentialType, CredentialTypeId, Provider, RelayLive, RelayOverview, RelayPending } from '#lib/types.ts';
import { ago, D, H } from './time';

const types: CredentialType[] = [
	{ id: 'anthropic_api', provider: 'anthropic', kind: 'api_key', label: 'Anthropic API key', accountId: false },
	{ id: 'claude_subscription', provider: 'anthropic', kind: 'subscription', label: 'Claude subscription', accountId: false },
	{ id: 'openai_api', provider: 'openai', kind: 'api_key', label: 'OpenAI API key', accountId: false },
	{ id: 'chatgpt_subscription', provider: 'openai', kind: 'subscription', label: 'ChatGPT subscription', accountId: true }
];

let seq = 0;
const now = () => new Date().toISOString();

function entry(type: CredentialTypeId, name: string, rest: Partial<CredentialEntry> = {}): CredentialEntry {
	const kind = types.find((t) => t.id === type)!;
	return {
		id: `mock-entry-${++seq}`, provider: kind.provider, type, kind: kind.kind, name, enabled: true, roles: [], profiles: [], revision: 1,
		status: 'valid', statusReason: 'stored', fingerprint: `sha256:mock-${seq}`, version: 1, lastUpdated: ago(3 * H), lastUsed: ago(14),
		expiresAt: null, expiryKnown: false, accountLabel: kind.accountId ? 'Supplied ChatGPT account (mock)' : null, accountVerified: false, custody: 'vault', ...rest
	};
}

/** In-browser credential lists; they follow the API's revision rules so stale writes fail the same way. */
const listing: CredentialListing = $state({
	providers: [
		{ provider: 'anthropic', label: 'Anthropic', revision: 1, entries: [
			entry('anthropic_api', 'Team API key'),
			entry('claude_subscription', 'Claude Max', { enabled: false, status: 'expired', statusReason: 'expired', lastUpdated: ago(9 * D), lastUsed: ago(2 * D),
				profiles: [{ target: 'example-org/ledger-core', profile: 'opus55-high' }, { target: 'example-org/retired-service', profile: 'opus55-high' }] }),
			entry('claude_subscription', 'Studio Sponsor', { custody: 'relay', relay: 'relay-mock-studio', version: 2, fingerprint: 'relay:5f1c09ab', lastUsed: ago(6) }),
			entry('claude_subscription', 'Laptop Sponsor', { custody: 'relay', relay: 'relay-mock-laptop', version: 3, fingerprint: 'relay:0b7e44d2', lastUsed: ago(2 * D) })
		] },
		{ provider: 'openai', label: 'OpenAI', revision: 1, entries: [
			entry('openai_api', 'Work API key', { roles: ['triage'], lastUpdated: ago(5 * H), lastUsed: ago(5 * H) }),
			entry('chatgpt_subscription', 'ChatGPT Plus', { lastUsed: null }),
			entry('chatgpt_subscription', 'Studio Sponsor', { custody: 'relay', relay: 'relay-mock-studio', version: 2, fingerprint: 'relay:5f1c09ab', roles: ['implementer'], accountLabel: null })
		] }
	],
	types,
	roles: [
		{ key: 'triage', label: 'Triage / intake' },
		{ key: 'planner', label: 'Planning' },
		{ key: 'plan_reviewers', label: 'Plan review' },
		{ key: 'implementer', label: 'Implementation' },
		{ key: 'pr_reviewers', label: 'PR review' }
	]
});

const started = ago(4).replace(/\.\d+Z$/, 'Z');
/** Synthetic live links by device; a device approved in this tab is not connected until it is listed here. */
const live: Record<string, Omit<RelayLive, 'relay'>> = {
	'relay-mock-studio': {
		idle: 1,
		lastSeen: now(),
		// Two sessions of one approval that started in the same second, told apart by link slot.
		active: [1, 2].map((slot) => ({ slot, entry: listing.providers[0].entries[2].id, route: 'claude-subscription', version: 2, since: started, task: { owner: 'example-org', repo: 'ledger-core', issue: slot === 1 ? 412 : 398 } }))
	},
	'relay-mock-laptop': { idle: 0, active: [], lastSeen: ago(2 * H) }
};

/** Setup and live status as the API reports them; this deployment has no download configured. */
export function relays(): RelayOverview {
	const approved = new Set(listing.providers.flatMap((list) => list.entries.map((entry) => entry.relay)));
	return {
		setup: { server: 'relay.concurro.example:7443', download: null, command: 'concurro-relay --server relay.concurro.example:7443', login: 'concurro-relay login --server relay.concurro.example:7443' },
		service: 'available',
		started: ago(3 * D),
		checked: now(),
		relays: Object.entries(live).filter(([relay]) => approved.has(relay)).map(([relay, state]) => ({ relay, ...state }))
	};
}

/** Routes a synthetic code registered: a code ending in C registers Claude, G ChatGPT, anything else both. */
function registered(code: string): string[] {
	if (!/^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/.test(code)) throw new Refused(404, 'unknown or expired code');
	return code.endsWith('C') ? ['claude-subscription'] : code.endsWith('G') ? ['chatgpt-subscription'] : ['chatgpt-subscription', 'claude-subscription'];
}

/** What a synthetic code registered, as the lookup API answers. */
export const pending = (code: string): RelayPending => ({ name: 'studio', routes: registered(code), expires_at: null });

/** The lists as a response carries them: a copy that later writes do not reach. */
export const read = (): CredentialListing => $state.snapshot(listing);

/** A refused synthetic write, with the HTTP status the API would answer. */
export class Refused extends Error {
	constructor(readonly status: number, message: string) { super(message); }
}

const group = (provider: Provider) => listing.providers.find((l) => l.provider === provider)!;

function current(id: string, revision: number): CredentialEntry {
	const found = listing.providers.flatMap((l) => l.entries).find((e) => e.id === id);
	if (!found) throw new Refused(410, 'credential was removed');
	if (found.revision !== revision) throw new Refused(409, 'credential changed; refresh before retrying');
	return found;
}

/** Record a change to one entry: its own revision and its list's both advance. */
function changed(target: CredentialEntry, fields: Partial<CredentialEntry>): CredentialEntry {
	Object.assign(target, fields, { revision: target.revision + 1 });
	group(target.provider).revision += 1;
	return $state.snapshot(target);
}

function store(target: CredentialEntry, secret: CredentialSecret) {
	if (!secret.secret.trim()) throw new Refused(422, 'Enter a credential.');
	if (target.type === 'chatgpt_subscription' && !secret.account_id?.trim()) throw new Refused(422, 'Enter the ChatGPT account ID.');
	Object.assign(target, { status: 'valid', statusReason: 'stored', fingerprint: `sha256:mock-${secret.secret.length}`, lastUpdated: now(), expiresAt: null, expiryKnown: false });
}

/** Append a new entry to its provider's list. */
export function add(type: CredentialTypeId, policy: CredentialPolicy, secret: CredentialSecret): CredentialEntry {
	const created = entry(type, policy.name, { ...policy, version: 0, lastUsed: null });
	store(created, secret);
	created.version = 1;
	const list = group(created.provider);
	list.entries.push(created);
	list.revision += 1;
	return $state.snapshot(created);
}

/** Add a synthetic Sponsor entry to each selected subscription list. */
export function addRelay(code: string, routes: string[], policy: CredentialPolicy): { entries: Record<string, CredentialEntry> } {
	if (!/^[BCDFGHJKLMNPQRSTVWXZ]{4}-[BCDFGHJKLMNPQRSTVWXZ]{4}$/.test(code)) throw new Refused(422, 'Enter the code shown by Sponsor.');
	if (!routes.length || routes.some((route) => !['claude-subscription', 'chatgpt-subscription'].includes(route)) || new Set(routes).size !== routes.length)
		throw new Refused(422, 'Select the routes shown by Sponsor.');
	const entries: Record<string, CredentialEntry> = {};
	for (const route of routes) {
		const type = route === 'claude-subscription' ? 'claude_subscription' : 'chatgpt_subscription';
		const created = entry(type, policy.name, { ...policy, custody: 'relay', relay: `relay-mock-${code}`, lastUsed: null, accountLabel: null });
		group(created.provider).entries.push(created);
		group(created.provider).revision += 1;
		entries[route] = $state.snapshot(created);
	}
	return { entries };
}

export function edit(id: string, revision: number, changes: Partial<CredentialPolicy & { enabled: boolean }>): CredentialEntry {
	return changed(current(id, revision), changes);
}

/** Store a new token version for one entry without touching its name, filters or position. */
export function replace(id: string, revision: number, secret: CredentialSecret): CredentialEntry {
	const target = current(id, revision);
	store(target, secret);
	return changed(target, { version: (target.version ?? 0) + 1 });
}

/** Rebind one entry per route the code registered to a new device; names, filters and positions stay. */
export function replaceDevice(entries: { id: string; revision: number }[], code: string): { entries: Record<string, CredentialEntry> } {
	const routes = registered(code);
	const targets = entries.map((item) => current(item.id, item.revision));
	const route = (target: CredentialEntry) => (target.type === 'claude_subscription' ? 'claude-subscription' : 'chatgpt-subscription');
	if (targets.map(route).toSorted().join() !== routes.join()) throw new Refused(409, 'relay approval unavailable');
	const relay = `relay-mock-${++seq}`;
	return { entries: Object.fromEntries(targets.map((target) => [route(target), changed(target, {
		custody: 'relay', relay, status: 'valid', statusReason: 'stored', version: (target.version ?? 0) + 1, lastUpdated: now(), fingerprint: `relay:mock-${seq}`
	})])) };
}

export function reorder(provider: Provider, revision: number, entries: string[]) {
	const list = group(provider);
	if (list.revision !== revision || entries.length !== list.entries.length || list.entries.some((e) => !entries.includes(e.id)))
		throw new Refused(409, 'credential changed; refresh before retrying');
	list.entries = entries.map((id) => list.entries.find((e) => e.id === id)!);
	list.revision += 1;
	return $state.snapshot(list);
}

export function remove(id: string, revision: number): CredentialEntry {
	const target = current(id, revision);
	const list = group(target.provider);
	list.entries = list.entries.filter((e) => e.id !== id);
	list.revision += 1;
	return $state.snapshot(target);
}
