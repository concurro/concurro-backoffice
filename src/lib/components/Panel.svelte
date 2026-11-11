<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		/** Small muted text after the title, e.g. a count. */
		meta?: string;
		/** Remove body padding (for tables and lists). */
		flush?: boolean;
		id?: string;
		actions?: Snippet;
		children: Snippet;
	}
	let { title, meta, flush = false, id, actions, children }: Props = $props();
</script>

<section class="panel" {id}>
	{#if title}
		<header>
			<h2>{title}{#if meta}<span class="meta num">{meta}</span>{/if}</h2>
			{#if actions}<div class="actions">{@render actions()}</div>{/if}
		</header>
	{/if}
	<div class="body" class:flush>{@render children()}</div>
</section>

<style>
	.panel {
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
		min-width: 0;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-3);
		min-height: 44px;
		padding: var(--s-2) var(--s-4);
		border-bottom: 1px solid var(--border);
	}
	.meta {
		margin-left: var(--s-2);
		color: var(--text-3);
		font-weight: var(--fw-regular);
	}
	.actions {
		display: flex;
		align-items: center;
		gap: var(--s-2);
	}
	.body {
		padding: var(--s-4);
	}
	.body.flush {
		padding: 0;
		position: relative;
		overflow-x: auto;
	}
</style>
