<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, subtitle, eyebrow, actions, children }: { title: string; subtitle?: string; eyebrow?: Snippet; actions?: Snippet; children?: Snippet } = $props();
</script>

<header class="page-header">
	<div class="main">
		{#if eyebrow}<div class="eyebrow">{@render eyebrow()}</div>{/if}
		<h1>{title}</h1>
		{#if subtitle}<p class="subtitle">{subtitle}</p>{/if}
		{#if children}<div class="extra">{@render children()}</div>{/if}
	</div>
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</header>

<style>
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--s-4);
		flex-wrap: wrap;
	}
	.main {
		min-width: 0;
	}
	.eyebrow {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		margin-bottom: var(--s-1);
		color: var(--text-3);
		font-size: var(--fs-sm);
	}
	.subtitle {
		margin-top: 2px;
		color: var(--text-2);
	}
	.extra {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s-2) var(--s-3);
		margin-top: var(--s-3);
	}
	.actions {
		display: flex;
		gap: var(--s-2);
	}
</style>
