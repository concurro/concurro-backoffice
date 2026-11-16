<script lang="ts">
	import { AlertTriangle, Clock } from 'lucide-svelte';
	import { session } from '#lib/api/index.ts';
	import Collapsible from '#lib/components/Collapsible.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { issueHref, taskHref } from '#lib/format.ts';
	import { PROVIDERS, providerFunding, providerName, type ProviderFunding } from '#lib/funding.ts';
	import type { IssueIntent } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const me = $derived(session.me.id ? String(session.me.id) : '');
	const href = (item: IssueIntent) => ('stage' in item ? taskHref(item) : issueHref(item));
	const label = (row: ProviderFunding) =>
		row.payer ? { me: 'You', org: 'Organization', other: `@${row.sponsor}`, none: 'No one' }[row.payer] : '—';
	const chargedToMe = (item: IssueIntent) =>
		(item.sponsorships?.charged_calls ?? []).filter((row) => row.kind === 'contributed' && row.sponsor === me).reduce((sum, row) => sum + row.calls, 0);
</script>

<svelte:head><title>My sponsorships · Concurro</title></svelte:head>
<PageHeader title="My sponsorships" subtitle="Issues where you pay or have paid for model calls with your own credentials." />
{#await data.result}<Skeleton rows={6} />{:then issues}
	{#if issues.length}
		<Panel flush>
			<table>
				<thead><tr><th>Issue</th>{#each PROVIDERS as provider}<th>{providerName(provider)}</th>{/each}<th class="num">Charged to you</th></tr></thead>
				<tbody>
					{#each issues as item (`${item.owner}/${item.repo}#${item.issue}`)}
						<tr>
							<td><a href={href(item)}><span class="mono">{item.repo}#{item.issue}</span> {item.title}</a></td>
							{#each PROVIDERS as provider}
								{@const row = providerFunding(item.sponsorships, provider, me)}
								<td class:mine={row.payer === 'me'}>
									{label(row)}{#if row.mine && row.payer !== 'me'}<span class="muted"> · your consent</span>{/if}{#if row.pending}<span class="muted"> · pending</span>{/if}
									{#if row.alert}<span class="flag {row.alert.kind}" title={row.alert.text}>{#if row.alert.kind === 'cooling'}<Clock size={13} aria-label={row.alert.text} />{:else}<AlertTriangle size={13} aria-label={row.alert.text} />{/if}</span>{/if}
								</td>
							{/each}
							<td class="num">{chargedToMe(item) || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</Panel>
		{@const receipts = issues.flatMap((item) => (item.sponsorships?.history ?? []).map((row) => ({ item, row })))}
		{#if receipts.length}
			<Collapsible title="Consent receipts" meta={String(receipts.length)}>
				<ul>{#each receipts as { item, row }}<li><span class="mono">{item.repo}#{item.issue}</span> · {row.provider} · {row.reason}{#if row.cutoff !== undefined && row.cutoff !== null} · withdrawn through revision {row.cutoff}{/if}</li>{/each}</ul>
			</Collapsible>
		{/if}
	{:else}
		<EmptyState title="No sponsorships yet" text="On a task, pick the person icon next to a provider to pay for its calls with your own credentials." />
	{/if}
{:catch error}<ErrorState {error} />{/await}

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--fs-sm);
	}
	th,
	td {
		padding: var(--s-2) var(--s-4);
		text-align: left;
		border-bottom: 1px solid var(--border);
	}
	tbody tr:last-child td {
		border-bottom: 0;
	}
	th {
		font-weight: var(--fw-medium);
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.num {
		text-align: right;
	}
	td.mine {
		color: var(--accent-text);
	}
	.muted {
		color: var(--text-3);
	}
	.flag {
		display: inline-flex;
		vertical-align: -2px;
		margin-left: 4px;
		color: var(--warning-fg);
	}
	.flag.paused {
		color: var(--danger-fg);
	}
	ul {
		margin: 0;
		padding-left: var(--s-4);
		font-size: var(--fs-xs);
		color: var(--text-2);
	}
</style>
