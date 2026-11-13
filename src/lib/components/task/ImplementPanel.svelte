<script lang="ts">
	import { GitPullRequest, Hammer, SquareTerminal } from 'lucide-svelte';
	import { ciMeta } from '#lib/meta.ts';
	import type { Task } from '#lib/types.ts';
	import Badge from '../Badge.svelte';
	import Button from '../Button.svelte';
	import EmptyState from '../EmptyState.svelte';
	import Panel from '../Panel.svelte';

	let { task, turns, ciLoading = false }: { task: Task; turns: string; /** Live CI is still being fetched. */ ciLoading?: boolean } = $props();
</script>

<Panel title="Implementation" id="implementation">
	{#snippet actions()}
		<Button size="sm" variant="ghost" icon={SquareTerminal} href={turns}>Turns</Button>
	{/snippet}
	{#if task.pr}
		<dl>
			<dt>Pull request</dt>
			<dd>
				<GitPullRequest size={14} aria-hidden="true" />
				<span class="mono">#{task.pr.number}</span>
				{task.pr.title}
			</dd>
			<dt>Branch</dt>
			<dd class="mono">{task.pr.branch}</dd>
			<dt>Head</dt>
			<dd class="mono">{task.pr.headSha}</dd>
			<dt>Changes</dt>
			<dd class="mono">
				{#if task.pr.additions !== null && task.pr.deletions !== null}
					<span class="add">+{task.pr.additions}</span> <span class="del">−{task.pr.deletions}</span>
				{:else}
					<span class="muted" title="Line counts are unavailable">—</span>
				{/if}
			</dd>
			<dt>CI</dt>
			<dd>{#if ciLoading}<span class="muted">Loading CI…</span>{:else}<Badge plain meta={ciMeta[task.pr.ci]} />{/if}</dd>
		</dl>
	{:else}
		<EmptyState
			icon={Hammer}
			title="Not implemented yet"
			text="The implementer starts once the design reviewers agree on a plan{task.mode === 'manual' ? ' and a writer approves it' : ''}."
		/>
	{/if}
</Panel>

<style>
	dl {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		gap: var(--s-2) var(--s-4);
		margin: 0;
		font-size: var(--fs-sm);
	}
	dt {
		color: var(--text-3);
	}
	dd {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.add {
		color: var(--success-fg);
	}
	.del {
		color: var(--danger-fg);
	}
</style>
