<script lang="ts">
	import { relTime } from '#lib/format.ts';
	import { stageMeta } from '#lib/meta.ts';
	import type { TaskCompletion } from '#lib/types.ts';
	import Avatar from '../Avatar.svelte';
	import Badge from '../Badge.svelte';
	import Panel from '../Panel.svelte';

	let { completion }: { completion: TaskCompletion } = $props();
</script>

<Panel title="Completion" meta={relTime(completion.at)} id="completion">
	<dl>
		<dt>Merged by</dt>
		<dd>{#if completion.mergedBy}<Avatar login={completion.mergedBy} size={18} label />{:else}<span class="muted">Unknown</span>{/if}</dd>
		<dt>Merge commit</dt>
		<dd class="mono">{completion.mergeSha}</dd>
		<dt>Observed during</dt>
		<dd><Badge plain meta={stageMeta[completion.observedStage]} /></dd>
		<dt>Handed off first</dt>
		<dd>
			{#if completion.handedOff}<Badge plain tone="success">Yes</Badge>{:else}<Badge plain tone="warning">No</Badge>{/if}
		</dd>
	</dl>
	<p class="note muted">
		{#if completion.handedOff}
			Merged after Concurro handed the pull request off.
		{:else}
			Merged before Concurro’s reviews and CI checks had all passed.
		{/if}
		Concurro records the merge but never re-checks its gates at merge time.
	</p>
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
		margin: 0;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.note {
		margin: var(--s-3) 0 0;
		font-size: var(--fs-xs);
	}
</style>
