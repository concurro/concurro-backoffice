<script lang="ts">
	import type { Snippet } from 'svelte';
	/** Compact table chrome. Pass plain `<thead>` / `<tbody>` markup as children. */
	let { children, label }: { children: Snippet; label: string } = $props();
</script>

<div class="scroll">
	<table aria-label={label}>{@render children()}</table>
</div>

<style>
	.scroll {
		/* Contain absolutely positioned descendants (.sr-only) so they cannot widen the page. */
		position: relative;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--fs-sm);
	}
	table :global(th) {
		padding: var(--s-2) var(--s-3);
		border-bottom: 1px solid var(--border);
		background: var(--surface-2);
		color: var(--text-3);
		font-size: var(--fs-2xs);
		font-weight: var(--fw-semibold);
		letter-spacing: 0.04em;
		text-align: left;
		text-transform: uppercase;
		white-space: nowrap;
	}
	table :global(td) {
		padding: 7px var(--s-3);
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
	}
	table :global(th:first-child),
	table :global(td:first-child) {
		padding-left: var(--s-4);
	}
	table :global(th:last-child),
	table :global(td:last-child) {
		padding-right: var(--s-4);
	}
	table :global(tbody tr:last-child td) {
		border-bottom: 0;
	}
	table :global(tbody tr:hover) {
		background: var(--surface-2);
	}
	table :global(.r) {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	table :global(.nowrap) {
		white-space: nowrap;
	}
	table :global(.title) {
		min-width: 220px;
	}
	table :global(.title a) {
		color: var(--text);
		font-weight: var(--fw-medium);
	}
	table :global(.sub) {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
</style>
