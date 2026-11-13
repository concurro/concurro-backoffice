<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { actions, session } from '#lib/api/index.ts';
	import { toast } from '#lib/state/toast.svelte.ts';
	import type { IssueRef, Provider, Sponsorship } from '#lib/types.ts';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import Panel from './Panel.svelte';

	let { issue, projection, writer = false }: { issue: IssueRef; projection?: Sponsorship; writer?: boolean } = $props();
	let busy = $state(false);
	const providers: Provider[] = ['openai', 'anthropic'];

	/** The command always binds one provider and the authenticated caller, never another owner. */
	async function command(command: 'sponsor' | 'withdraw', provider: Provider) {
		if (busy) return;
		busy = true;
		try {
			toast(await actions.command(issue, command, provider));
			await invalidateAll();
		} catch (error) {
			toast(error instanceof Error ? error.message : 'The command could not be posted.', 'danger');
		} finally { busy = false; }
	}
</script>

<Panel title="Provider sponsorship" id="sponsorship">
	<p class="notice">Current model calls remain org-funded. Sponsorship records your consent to fund this provider on this issue when contributed inference is enabled, including authorized retries.</p>
	<p class="state">Source: {projection?.status ?? 'unavailable'}{#if projection?.task_status} · task: {projection.task_status}{/if}</p>
	{#each providers as provider}
		{@const slot = projection?.slots?.[provider]}
		{@const source = projection?.source_slots?.[provider]}
		{@const mine = !!session.me.id && slot?.sponsor_id === String(session.me.id)}
		<div class="slot">
			<header><strong>{provider === 'openai' ? 'OpenAI' : 'Anthropic'}</strong><Badge plain tone={slot?.sponsor_id ? 'accent' : 'neutral'}>{slot?.sponsor_id ? `@${slot.login ?? slot.sponsor_id}` : slot?.status ?? 'unassigned'}</Badge></header>
			{#if slot?.epoch !== undefined}<p class="muted">Sponsorship revision {slot.epoch}{mine ? ' · you' : ''}</p>{/if}
			{#if source?.sponsor_id && source.sponsor_id !== slot?.sponsor_id}<p class="muted">Issue intent: @{source.login ?? source.sponsor_id}; task adoption pending.</p>{/if}
			{#if projection?.pending?.includes(provider) || projection?.status !== 'confirmed' || projection?.task_status === 'pending'}<p class="muted">Confirmation or adoption pending. Displayed ownership may change after reconciliation.</p>{/if}
			{#if projection?.coverage?.[provider]?.length}
				<ul>{#each projection.coverage[provider] ?? [] as route}<li><span class="mono">{route.profile}</span> · {route.route} · {route.status?.replaceAll('_', ' ') ?? 'unknown'}</li>{/each}</ul>
			{:else}<p class="muted">Coverage is not yet confirmed for this provider.</p>{/if}
			<div class="actions">
				<Button size="sm" disabled={busy || !writer} onclick={() => command('sponsor', provider)}>{mine ? 'Renew my' : 'Sponsor'} {provider === 'openai' ? 'OpenAI' : 'Anthropic'}</Button>
				<Button size="sm" variant="danger" disabled={busy} onclick={() => command('withdraw', provider)}>Withdraw my {provider === 'openai' ? 'OpenAI' : 'Anthropic'} consent</Button>
			</div>
		</div>
	{/each}
	<p class="notice">Sponsor replaces only this provider’s prospective owner. Withdrawal affects only your own consent, including older epochs; it does not revoke your token, change the other provider or remove design approvals. Self-withdrawal remains available if writer access is lost.</p>
	<Button size="sm" onclick={() => invalidateAll()} disabled={busy}>Refresh sponsorship</Button>
</Panel>

<style>
	.notice, .state, li { font-size: var(--fs-xs); color: var(--text-2); }
	.state { margin-top: var(--s-2); }
	.slot { display: grid; gap: var(--s-2); border-top: 1px solid var(--border); padding-top: var(--s-3); margin-top: var(--s-3); margin-bottom: var(--s-3); font-size: var(--fs-sm); }
	header, .actions { display: flex; gap: var(--s-2); flex-wrap: wrap; align-items: center; }
	ul { margin: 0; padding-left: var(--s-4); }
</style>
