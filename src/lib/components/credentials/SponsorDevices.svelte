<script lang="ts">
	import { ChevronRight, MonitorSmartphone, RefreshCw } from 'lucide-svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import { api, session } from '#lib/api/index.ts';
	import { issueHref, relTime, taskHref } from '#lib/format.ts';
	import { connection, deviceUsage, entryRoute, readUsage, routeName, type Completeness, type Connection, type RelayDevice, type UsageRead } from '#lib/relays.ts';
	import type { RelayOverview, Tone } from '#lib/types.ts';

	/** The owner's Sponsor devices with live connection state, capacity, activity and usage. */
	let { devices, overview, busy, onsetup, onreplace }: {
		devices: RelayDevice[];
		/** Null while loading; a failed read is passed as `service: 'unavailable'`. */
		overview: RelayOverview | null;
		busy: boolean;
		onsetup: () => void;
		onreplace: (device: RelayDevice) => void;
	} = $props();

	let expanded = $state<Record<string, boolean>>({});
	/** Usage evidence, read when a device is first opened and again on Refresh or after a failed read. */
	let usage = $state<UsageRead>({ issues: null, failed: false });
	let reading = $state(false);
	const me = $derived(session.me.id ? String(session.me.id) : '');

	async function refreshUsage() {
		if (reading) return;
		reading = true;
		usage = await readUsage(api.sponsorships, usage);
		reading = false;
	}
	function open(device: RelayDevice) {
		expanded[device.relay] = !expanded[device.relay];
		if (expanded[device.relay] && (!usage.issues || usage.failed)) refreshUsage();
	}
	/** A figure's value, or why it cannot be trusted as complete. */
	const covered = (status: Completeness, value: string) => (status === 'unavailable' ? 'Unavailable' : status === 'partial' ? `${value} (partial)` : value);

	const badge = (state: Connection): { tone: Tone; label: string } =>
		({
			online: { tone: 'success', label: 'Connected' },
			offline: { tone: 'warning', label: 'Offline' },
			unseen: { tone: 'neutral', label: 'Not connected' },
			unknown: { tone: 'neutral', label: 'Status unknown' }
		})[state.state] as { tone: Tone; label: string };

	function detail(state: Connection): string {
		if (state.state === 'online') return `${state.free} of ${state.total} ${state.total === 1 ? 'link' : 'links'} free`;
		if (state.state === 'offline') return `Last seen ${relTime(state.since)}`;
		if (state.state === 'unseen') return state.since ? `Not seen since Concurro restarted ${relTime(state.since)}` : 'Not seen yet';
		return { loading: 'Checking…', unavailable: 'Live status unavailable', unconfigured: 'Live status is not configured' }[state.reason];
	}

	const live = (device: RelayDevice) => overview?.relays.find((item) => item.relay === device.relay);
	const entryName = (device: RelayDevice, id: string) => device.entries.find((entry) => entry.id === id);
	const short = (relay: string) => relay.replace(/^relay-/, '').slice(0, 8);
</script>

<section aria-labelledby="sponsor-devices">
	<div class="head">
		<h2 id="sponsor-devices">Sponsor devices</h2>
		<Button size="sm" disabled={busy} onclick={onsetup}>Set up Sponsor</Button>
	</div>
	{#if devices.length}
		<ul class="devices">
			{#each devices as device (device.relay)}
				{@const state = connection(device.relay, overview)}
				{@const current = live(device)}
				<li>
					<div class="row">
						<button type="button" class="summary" aria-expanded={!!expanded[device.relay]} aria-controls="device-{device.relay}" onclick={() => open(device)}>
							<span class="chevron"><ChevronRight size={14} aria-hidden="true" /></span>
							<span class="text">
								<span class="name">{device.name}</span>
								<span class="sub">{device.entries.map((entry) => routeName(entryRoute(entry) ?? '')).join(' · ')} · <span class="mono" title={device.relay}>{short(device.relay)}</span> · {detail(state)}</span>
							</span>
						</button>
						<Badge tone={badge(state).tone}>{badge(state).label}</Badge>
						<Button size="sm" variant="ghost" icon={RefreshCw} disabled={busy} onclick={() => onreplace(device)}>Replace</Button>
					</div>
					{#if expanded[device.relay]}
						<div class="details" id="device-{device.relay}">
							<dl>
								<div><dt>Approvals</dt><dd>{#each device.entries as entry (entry.id)}<div>{routeName(entryRoute(entry) ?? '')} · {entry.enabled ? 'enabled' : 'disabled'} · approved {entry.lastUpdated ? relTime(entry.lastUpdated) : 'at an unknown time'}</div>{/each}</dd></div>
								<div><dt>Active sessions</dt><dd>
									{#if state.state === 'unknown'}Unknown
									{:else if current?.active.length}
										{#each current.active as lease (lease.slot)}
											<div>{routeName(lease.route)} · {#if lease.task}<a href={issueHref(lease.task)}>{lease.task.repo}#{lease.task.issue}</a>{:else}task unknown{/if} · since {relTime(lease.since)}{#if !entryName(device, lease.entry)} · earlier approval{/if}</div>
										{/each}
									{:else}None{/if}
								</dd></div>
							</dl>
							{#if usage.issues}
								{@const used = deviceUsage(device, usage.issues, me)}
								<dl>
									<div><dt>Charged calls</dt><dd>
										{#if used.ledger === 'unavailable'}Unavailable
										{:else}
											{#each used.charged as row (row.issue.owner + row.issue.repo + row.issue.issue)}<div><a href={'stage' in row.issue ? taskHref(row.issue) : issueHref(row.issue)}>{row.issue.repo}#{row.issue.issue}</a> · {row.calls}</div>{:else}None{/each}
											{#if used.ledger === 'partial'}<div class="muted">Partial</div>{/if}
										{/if}
									</dd></div>
									<div><dt>Provider-reported tokens</dt><dd>{covered(used.reports, used.reported.requests ? `${used.reported.input.toLocaleString()} in / ${used.reported.output.toLocaleString()} out over ${used.reported.requests} ${used.reported.requests === 1 ? 'response' : 'responses'}` : 'None reported')}</dd></div>
									<div><dt>Failures</dt><dd>{covered(used.reports, used.failures.length ? used.failures.map((failure) => `${failure.category.replaceAll('_', ' ')} ×${failure.count}`).join(', ') : 'None')}</dd></div>
								</dl>
							{/if}
							<p class="muted usage-note">
								{#if reading}Loading usage…{:else if usage.failed}{usage.issues ? 'Refresh failed; showing earlier usage.' : 'Usage could not be loaded.'}{:else}For this device's current approvals, from tasks you can view. Charged calls are Concurro's budget count; tokens are what the provider reported, not a bill.{/if}
								<button type="button" class="link" disabled={reading} onclick={refreshUsage}>Refresh</button>
							</p>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty">
			<MonitorSmartphone size={16} aria-hidden="true" />
			<span>Run Sponsor on your machine to fund tasks with your Claude or ChatGPT subscription. Your login stays there.</span>
		</div>
	{/if}
</section>

<style>
	section { margin-bottom: var(--s-5); }
	.head { display: flex; align-items: center; justify-content: space-between; gap: var(--s-2); margin-bottom: var(--s-2); }
	h2 { margin: 0; font-size: var(--fs-md); font-weight: var(--fw-semibold); }
	.devices { margin: 0; padding: 0; list-style: none; border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--surface); }
	li + li { border-top: 1px solid var(--border); }
	.row { display: flex; align-items: center; gap: var(--s-2); padding: var(--s-2) var(--s-3); }
	.summary { display: flex; flex: 1; align-items: center; gap: var(--s-2); min-width: 0; padding: var(--s-1); border: 0; background: none; color: inherit; text-align: left; cursor: pointer; }
	.chevron { display: flex; color: var(--text-3); transition: transform var(--dur) var(--ease); }
	.summary[aria-expanded='true'] .chevron { transform: rotate(90deg); }
	.text { display: grid; min-width: 0; }
	.name { font-size: var(--fs-md); font-weight: var(--fw-medium); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.sub { font-size: var(--fs-xs); color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.mono { font-family: var(--font-mono); }
	.details { display: grid; gap: var(--s-3); padding: var(--s-1) var(--s-4) var(--s-3) var(--s-7); font-size: var(--fs-sm); }
	dl { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--s-3); margin: 0; }
	dt { font-size: var(--fs-xs); color: var(--text-2); }
	dd { display: grid; gap: 2px; margin: 0; overflow-wrap: anywhere; }
	.muted { margin: 0; font-size: var(--fs-xs); color: var(--text-2); }
	.link { margin-left: var(--s-1); padding: 0; border: 0; background: none; color: var(--accent-text); font: inherit; text-decoration: underline; cursor: pointer; }
	.link:disabled { color: var(--text-3); cursor: default; }
	.empty { display: flex; align-items: center; gap: var(--s-2); padding: var(--s-3); border: 1px dashed var(--border-strong); border-radius: var(--r-lg); font-size: var(--fs-sm); color: var(--text-2); }
	@media (max-width: 560px) {
		.row { flex-wrap: wrap; padding-inline: var(--s-2); }
		.summary { flex-basis: 100%; }
		.details { padding-left: var(--s-4); }
	}
</style>
