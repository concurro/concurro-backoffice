<script lang="ts">
	import { ExternalLink } from 'lucide-svelte';
	import { findingMeta, isResolved, severityTone } from '#lib/meta.ts';
	import type { Finding } from '#lib/types.ts';
	import Badge from '../Badge.svelte';
	import DataTable from '../DataTable.svelte';
	import EmptyState from '../EmptyState.svelte';
	import Inline from '../Inline.svelte';

	interface Props {
		findings: Finding[];
		/** Empty-state text when no finding was ever raised. */
		none: string;
		/** Element the thread links point at; without it the thread column is omitted. */
		anchor?: string;
		/** Note under the table on what the statuses mean here. */
		rule?: string;
	}
	let { findings, none, anchor, rule }: Props = $props();

	let showResolved = $state(true);
	const shown = $derived(findings.filter((f) => showResolved || !isResolved(f.status)));
</script>

<div class="findings-head">
	<h3>Findings</h3>
	<label><input type="checkbox" bind:checked={showResolved} /> Show resolved</label>
</div>
{#if shown.length}
	<DataTable label="Findings">
		<thead>
			<tr><th>ID</th><th>Status</th><th>Severity</th><th>Finding</th>{#if anchor}<th><span class="sr-only">Thread</span></th>{/if}</tr>
		</thead>
		<tbody>
			{#each shown as f (f.id)}
				<tr class:retired={isResolved(f.status)}>
					<td class="mono nowrap">{f.id}</td>
					<td><Badge meta={findingMeta[f.status]} /></td>
					<td><Badge plain tone={severityTone[f.severity]}>{f.severity}</Badge></td>
					<td class="title">
						<p class="ftitle"><Inline text={f.title} /></p>
						<p class="sub"><span class="mono">{f.path}:{f.line}</span> · <Inline text={f.detail} /></p>
						<p class="sub">Raised by <span class="mono">{f.raisedBy}</span> in round {f.raisedRound}</p>
					</td>
					{#if anchor}<td class="nowrap"><a href="#{anchor}" title="GitHub thread {f.thread}" aria-label="Open GitHub thread {f.thread}"><ExternalLink size={14} /></a></td>{/if}
				</tr>
			{/each}
		</tbody>
	</DataTable>
	{#if rule}<p class="rule muted">{rule}</p>{/if}
{:else}
	<EmptyState title="No findings" text={findings.length ? 'All findings are resolved. Tick “Show resolved” to see them.' : none} />
{/if}

<style>
	.findings-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--s-2) var(--s-4);
	}
	.findings-head label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--text-2);
		font-size: var(--fs-sm);
		cursor: pointer;
	}
	.findings-head input {
		accent-color: var(--accent);
	}
	.ftitle {
		font-weight: var(--fw-medium);
	}
	.retired .ftitle {
		color: var(--text-2);
		font-weight: var(--fw-regular);
	}
	td a {
		display: inline-flex;
		color: var(--text-3);
	}
	.rule {
		padding: var(--s-2) var(--s-4);
		border-top: 1px solid var(--border);
		font-size: var(--fs-xs);
	}
</style>
