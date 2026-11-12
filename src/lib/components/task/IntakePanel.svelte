<script lang="ts">
	import { FileText, Inbox } from 'lucide-svelte';
	import { relTime } from '#lib/format.ts';
	import { verdictMeta } from '#lib/meta.ts';
	import type { Task } from '#lib/types.ts';
	import Badge from '../Badge.svelte';
	import EmptyState from '../EmptyState.svelte';
	import Inline from '../Inline.svelte';
	import Panel from '../Panel.svelte';
	import Prose from '../Prose.svelte';

	let { task }: { task: Task } = $props();
	const rounds = $derived([...task.intake].reverse());
</script>

<Panel title="Issue" id="issue">
	{#if task.body?.trim()}
		<Prose text={task.body ?? ''} />
	{:else}
		<EmptyState icon={FileText} title="No description" text="The issue was opened without a description." />
	{/if}
</Panel>

<Panel title="Triage" meta={rounds.length ? `${rounds.length} assessment${rounds.length > 1 ? 's' : ''}` : undefined} flush id="triage">
	{#each rounds as r, i}
		<details open={i === 0}>
			<summary>
				<span class="mono agent">{r.agent}</span>
				<span class="mono muted">{r.profile}</span>
				{#if r.at}<span class="muted">· {relTime(r.at)}</span>{/if}
				<span class="decision">
					{#if r.risk}<Badge plain tone="neutral">{r.risk} risk</Badge>{/if}
					<Badge meta={verdictMeta[r.decision] ?? verdictMeta.pending} />
				</span>
			</summary>
			<div class="body">
				{#if r.rationale}<p><Inline text={r.rationale} /></p>{/if}
				{#if r.concerns.length}
					<h3>Concerns for planning</h3>
					<ul>
						{#each r.concerns as concern}<li><Inline text={concern} /></li>{/each}
					</ul>
				{/if}
			</div>
		</details>
	{:else}
		<EmptyState icon={Inbox} title="Not triaged yet" text="The triage agent assesses the issue before planning starts." />
	{/each}
</Panel>

<style>
	details {
		border-bottom: 1px solid var(--border);
	}
	details:last-child {
		border-bottom: 0;
	}
	summary {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--s-2);
		padding: var(--s-2) var(--s-4);
		cursor: pointer;
		font-size: var(--fs-sm);
	}
	summary:hover {
		background: var(--surface-2);
	}
	.agent {
		font-weight: var(--fw-semibold);
	}
	.decision {
		display: inline-flex;
		gap: var(--s-2);
		margin-left: auto;
	}
	.body {
		display: grid;
		gap: var(--s-2);
		max-width: 78ch;
		padding: var(--s-1) var(--s-4) var(--s-4);
		font-size: var(--fs-sm);
		line-height: 1.6;
	}
	h3 {
		margin: var(--s-2) 0 0;
		color: var(--text-3);
		font-size: var(--fs-2xs);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	ul {
		margin: 0;
		padding-left: var(--s-5, 20px);
	}
</style>
