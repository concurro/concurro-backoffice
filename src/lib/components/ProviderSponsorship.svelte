<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { actions, session } from '#lib/api/index.ts';
	import { withBase } from '#lib/paths.ts';
	import { toast } from '#lib/state/toast.svelte.ts';
	import type { IssueRef, Provider, Sponsorship } from '#lib/types.ts';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import Panel from './Panel.svelte';

	let { issue, projection, writer = false }: { issue: IssueRef; projection?: Sponsorship; writer?: boolean } = $props();
	let busy = $state(false);
	const providers: Provider[] = ['openai', 'anthropic'];
    const recovery = $derived(projection?.recovery);
    const scheduled = $derived(!!recovery?.eligible && !!recovery.delivery && recovery.delivery.id !== recovery.consumed);

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
	<p class="notice">{#if projection?.funding === 'contributed'}This task uses each provider’s selected sponsor credentials, including authorized retries. Missing credentials pause new calls; there is no organization fallback.{:else if projection?.funding === 'org'}This task uses organization credentials. These provider grants are prospective consent for contributed funding, including authorized retries.{:else}Funding policy is unconfirmed. Sponsorship records your consent for this provider, including authorized retries; displayed consent alone does not prove a personal charge.{/if}</p>
    {#if projection?.calls !== undefined}<p class="state">Charged attempts: <strong>{projection.calls}</strong>. Recorded debits keep their original owner and version; token observations below are supplementary.</p>{/if}
    {#if projection?.task_stage === 'awaiting_credentials'}
        <p class="notice"><strong>{scheduled ? 'Automatic recovery scheduled' : recovery?.eligible ? 'Waiting for credentials' : 'Writer action required'}</strong> · {#if projection.recovery?.status}{projection.recovery.status}.{' '}{/if}{#if scheduled && recovery?.delivery}Retry no earlier than {new Date(recovery.delivery.due_at * 1000).toLocaleString()}. Current consent, all required coverage, authority and remaining budget will be checked first.{:else if recovery?.eligible}{#if recovery.delivery && recovery.delivery.id === recovery.consumed}Waiting for newly validated credentials or writer action.{:else}Waiting for validated credentials for all required provider routes.{/if} Auth or quota pauses need a newly validated replacement version; the same token can be supplied again if capacity has returned.{:else}This pause has no eligible automatic retry; a writer must correct or reassess it.{/if} <a href={withBase('/me/credentials')}>Manage my credentials</a></p>
    {/if}
	<p class="state">Source: {projection?.status ?? 'unavailable'}{#if projection?.task_status} · task: {projection.task_status}{/if}</p>
	{#each providers as provider}
		{@const slot = projection?.slots?.[provider]}
		{@const source = projection?.source_slots?.[provider]}
		{@const mine = !!session.me.id && slot?.sponsor_id === String(session.me.id)}
            {@const charged = projection?.charged_calls?.filter((row) => row.provider === provider && row.kind === 'contributed') ?? []}
		<div class="slot">
			<header><strong>{provider === 'openai' ? 'OpenAI' : 'Anthropic'}</strong><Badge plain tone={slot?.sponsor_id ? 'accent' : 'neutral'}>{slot?.sponsor_id ? `@${slot.login ?? slot.sponsor_id}` : slot?.status ?? 'unassigned'}</Badge></header>
			{#if slot?.epoch !== undefined}<p class="muted">Sponsorship revision {slot.epoch}{mine ? ' · you' : ''}</p>{/if}
			{#if source?.sponsor_id && source.sponsor_id !== slot?.sponsor_id}<p class="muted">Issue intent: @{source.login ?? source.sponsor_id}; task adoption pending.</p>{/if}
			{#if projection?.pending?.includes(provider) || projection?.status !== 'confirmed' || projection?.task_status === 'pending'}<p class="muted">Confirmation or adoption pending. Displayed ownership may change after reconciliation.</p>{/if}
			{#if projection?.coverage?.[provider]?.length}
				<ul>{#each projection.coverage[provider] ?? [] as route}<li><span class="mono">{route.profile}</span> · {route.role} · {route.route} · {route.model}{#if route.version !== null && route.version !== undefined} · version {route.version}{/if} · {route.status?.replaceAll('_', ' ') ?? 'unknown'}</li>{/each}</ul>
			{:else}<p class="muted">Coverage is not yet confirmed for this provider.</p>{/if}
            {#if charged.length}<ul aria-label={provider + ' charged attempts'}>{#each charged as row (row.id)}<li>{row.sponsor === slot?.sponsor_id ? `@${slot?.login ?? row.sponsor}` : `user ${row.sponsor}`} · {row.route} · version {row.version ?? 'unknown'} · <strong>{row.calls} charged {row.calls === 1 ? 'attempt' : 'attempts'}</strong></li>{/each}</ul>{:else if projection?.calls !== undefined}<p class="muted">No contributed attempts recorded for this provider.</p>{/if}
			<div class="actions">
				<Button size="sm" disabled={busy || !writer} onclick={() => command('sponsor', provider)}>{mine ? 'Renew my' : 'Sponsor'} {provider === 'openai' ? 'OpenAI' : 'Anthropic'}</Button>
				<Button size="sm" variant="danger" disabled={busy} onclick={() => command('withdraw', provider)}>Withdraw my {provider === 'openai' ? 'OpenAI' : 'Anthropic'} consent</Button>
			</div>
		</div>
	{/each}
    {#if projection?.charged_calls?.some((row) => row.kind === 'org')}<p class="notice">Organization-funded attempts: {projection.charged_calls.filter((row) => row.kind === 'org').reduce((sum, row) => sum + row.calls, 0)}. These are not charged to the displayed personal sponsors.</p>{/if}
	<p class="notice">Sponsor replaces only this provider’s owner. Withdrawal affects only your own consent, including older sponsorship revisions; it does not revoke your token, change the other provider or remove design approvals. Self-withdrawal remains available if writer access is lost.</p>
	{#if projection?.observations_status === 'unknown'}<p class="notice">Gateway request evidence is unavailable. Usage and completion are unknown.</p>{/if}
	{#if projection?.observations?.length}
        <details><summary>Gateway request evidence</summary><ul>{#each projection.observations as event}<li>{event.binding.sponsorship_provider} · owner {event.binding.sponsor} · credential version {event.binding.credential_version} · {event.source ?? 'gateway'} · {event.category ?? (event.source === 'provider' && event.completed ? 'provider completed' : 'request observed')} · {event.usage ? `${event.usage.input_tokens} input / ${event.usage.output_tokens} output tokens` : 'usage unknown'}</li>{/each}</ul></details>
    {/if}
	<Button size="sm" onclick={() => invalidateAll()} disabled={busy}>Refresh sponsorship</Button>
</Panel>

<style>
	.notice, .state, li { font-size: var(--fs-xs); color: var(--text-2); }
	.state { margin-top: var(--s-2); }
	.slot { display: grid; gap: var(--s-2); border-top: 1px solid var(--border); padding-top: var(--s-3); margin-top: var(--s-3); margin-bottom: var(--s-3); font-size: var(--fs-sm); }
	header, .actions { display: flex; gap: var(--s-2); flex-wrap: wrap; align-items: center; }
	ul { margin: 0; padding-left: var(--s-4); }
</style>
