<script lang="ts">
	import { CircleCheck, FileText } from 'lucide-svelte';
	import { diffLines, relTime } from '#lib/format.ts';
	import type { Task } from '#lib/types.ts';
	import Badge from '../Badge.svelte';
	import DiffView from '../DiffView.svelte';
	import EmptyState from '../EmptyState.svelte';
	import Panel from '../Panel.svelte';
	import Prose from '../Prose.svelte';

	let { task }: { task: Task } = $props();

	let picked = $state<string>();
	let showDiff = $state(false);
	const selected = $derived(task.plans.find((p) => p.id === picked) ?? task.plans.at(-1));
	const previous = $derived(selected && task.plans.find((p) => p.version === selected.version - 1));
</script>

<Panel title="Plan" meta={task.plans.length ? `${task.plans.length} version${task.plans.length > 1 ? 's' : ''}` : undefined} id="plan">
	{#snippet actions()}
		{#if selected}
			<div class="versions" role="group" aria-label="Plan version">
				{#each task.plans as p (p.id)}
					<button class:on={p.id === selected.id} aria-pressed={p.id === selected.id} onclick={() => (picked = p.id)}>v{p.version}</button>
				{/each}
			</div>
		{/if}
	{/snippet}

	{#if selected}
		<div class="meta">
			<span class="mono id">{selected.id}</span>
			<span class="muted">{selected.summary} · {relTime(selected.createdAt)}</span>
			{#if task.approvedPlanId === selected.id}<Badge tone="success" icon={CircleCheck}>Approved</Badge>{/if}
			<label class="toggle" class:disabled={!previous}>
				<input type="checkbox" bind:checked={showDiff} disabled={!previous} />
				{previous ? `Diff against v${previous.version}` : 'No earlier version'}
			</label>
		</div>
		{#if showDiff && previous}
			<DiffView lines={diffLines(previous.body, selected.body)} label="Plan v{previous.version} to v{selected.version}" />
		{:else}
			<Prose text={selected.body} />
		{/if}
	{:else}
		<EmptyState icon={FileText} title="No plan yet" text="The planner publishes a plan after intake accepts the issue." />
	{/if}
</Panel>

<style>
	.versions {
		display: flex;
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		overflow: hidden;
	}
	.versions button {
		height: 24px;
		padding: 0 var(--s-2);
		border: 0;
		border-right: 1px solid var(--border-strong);
		background: var(--surface);
		color: var(--text-2);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		cursor: pointer;
	}
	.versions button:last-child {
		border-right: 0;
	}
	.versions button.on {
		background: var(--accent-soft);
		color: var(--accent-text);
		font-weight: var(--fw-semibold);
	}
	.versions button:focus-visible {
		outline-offset: -2px;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s-2) var(--s-3);
		padding-bottom: var(--s-3);
		margin-bottom: var(--s-3);
		border-bottom: 1px solid var(--border);
		font-size: var(--fs-sm);
	}
	.id {
		padding: 1px 6px;
		border: 1px solid var(--border);
		border-radius: var(--r-sm);
		background: var(--surface-2);
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-left: auto;
		color: var(--text-2);
		cursor: pointer;
	}
	.toggle.disabled {
		color: var(--text-disabled);
		cursor: default;
	}
	.toggle input {
		accent-color: var(--accent);
	}
</style>
