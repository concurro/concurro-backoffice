<script lang="ts">
	import { session } from '#lib/api/index.ts';
	import { PROVIDERS, providerName } from '#lib/funding.ts';
	import type { Sponsorship } from '#lib/types.ts';
	import Collapsible from './Collapsible.svelte';

	/** Writer-only funding evidence behind the compact funding widget. */
	let { projection }: { projection: Sponsorship } = $props();
	const me = $derived(session.me.id ? String(session.me.id) : '');
	const charged = $derived(projection.charged_calls ?? []);
	const orgCalls = $derived(charged.filter((row) => row.kind === 'org').reduce((sum, row) => sum + row.calls, 0));
	const failures = $derived(projection.recovery?.failures ?? []);
	const requirement = $derived(projection.recovery?.requirement);
	const pausedCall = $derived([requirement?.provider, requirement?.role?.replaceAll('_', ' '), requirement?.profile, requirement?.model].filter(Boolean).join(' · '));
	const login = (id?: string | null) => {
		const slot = Object.values(projection.slots ?? {}).find((slot) => slot?.sponsor_id === id);
		return slot?.login ? `@${slot.login}` : `user ${id}`;
	};
</script>

<Collapsible title="Funding audit" meta={projection.calls !== undefined ? `${projection.calls} charged` : undefined}>
	<div class="pad">
		<dl>
			<dt>Status</dt>
			<dd>{projection.status}{#if projection.task_status} · task {projection.task_status}{/if}{#if projection.pending?.length} · pending {projection.pending.join(', ')}{/if}</dd>
			{#if pausedCall}<dt>Paused call</dt><dd>{pausedCall}{#if projection.recovery?.status} · last check {projection.recovery.status}{/if}</dd>{/if}
			{#if failures.length}<dt>Failures</dt><dd>{#each failures as failure}<div>{failure.category?.replaceAll('_', ' ') ?? 'unknown'}{#if failure.binding?.route} · {failure.binding.route}{/if}{#if failure.binding?.credential_version} · version {failure.binding.credential_version}{/if}</div>{/each}</dd>{/if}
			{#if orgCalls}<dt>Organization</dt><dd>{orgCalls} charged</dd>{/if}
			{#each PROVIDERS as provider}
				{@const slot = projection.slots?.[provider]}
				{@const routes = projection.coverage?.[provider] ?? []}
				{@const rows = charged.filter((row) => row.provider === provider && row.kind === 'contributed')}
				<dt>{providerName(provider)}</dt>
				<dd>
					<div>Sponsor {slot?.sponsor_id ? login(slot.sponsor_id) : (slot?.status ?? 'none')}{#if slot?.epoch !== undefined} · revision {slot.epoch}{/if}</div>
					{#each routes as route}<div><span class="mono">{route.profile}</span> · {route.role.replaceAll('_', ' ')} · {route.model} · {route.status === 'available' ? (slot?.sponsor_id === me && route.entry ? `uses ${route.entry}` : 'available') : (route.status ?? 'unknown')}</div>{/each}
					{#each rows as row (row.id)}<div>{login(row.sponsor)} · {row.route} · version {row.version ?? 'unknown'} · {row.calls} charged</div>{/each}
				</dd>
			{/each}
			{#if projection.native_status === 'unavailable'}<dt>Native logs</dt><dd>Unavailable; missing usage stays unknown.</dd>{/if}
			{#if projection.observations_status === 'unknown'}<dt>Gateway</dt><dd>Request evidence unavailable; usage and completion are unknown.</dd>{/if}
		</dl>
		{#if projection.observations?.length}
			<Collapsible title="Gateway request evidence" meta={String(projection.observations.length)}>
				<ul>{#each projection.observations as event}<li>{providerName(event.binding.sponsorship_provider)} · {login(event.binding.sponsor)} · version {event.binding.credential_version} · {event.source ?? 'gateway'} · {event.category ?? (event.source === 'provider' && event.completed ? 'completed' : 'observed')} · {event.usage ? `${event.usage.input_tokens} in / ${event.usage.output_tokens} out` : 'usage unknown'}</li>{/each}</ul>
			</Collapsible>
		{/if}
	</div>
</Collapsible>

<style>
	.pad {
		padding: var(--s-2) var(--s-3) var(--s-3);
	}
	dl {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: var(--s-2) var(--s-4);
		margin: 0 0 var(--s-3);
		font-size: var(--fs-sm);
	}
	dt {
		color: var(--text-3);
	}
	dd {
		margin: 0;
		display: grid;
		gap: 2px;
		color: var(--text-2);
	}
	ul {
		margin: 0;
		padding-left: var(--s-4);
		font-size: var(--fs-xs);
		color: var(--text-2);
	}
</style>
