<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		meta?: string;
		open?: boolean;
		mono?: boolean;
		tone?: 'neutral' | 'warning' | 'danger';
		children: Snippet;
	}
	let { title, meta, open = false, mono = false, tone = 'neutral', children }: Props = $props();
</script>

<details class="tone-{tone}" {open}>
	<summary>
		<span class="chev"><ChevronRight size={14} aria-hidden="true" /></span>
		<span class="title" class:mono>{title}</span>
		{#if meta}<span class="meta num">{meta}</span>{/if}
	</summary>
	<div class="body">{@render children()}</div>
</details>

<style>
	details {
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
	}
	details.tone-warning,
	details.tone-danger {
		border-color: var(--tone-border);
	}
	summary {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-2) var(--s-3);
		cursor: pointer;
		list-style: none;
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
		border-radius: var(--r-md);
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary:hover {
		background: var(--surface-2);
	}
	.chev {
		display: flex;
		color: var(--text-3);
		transition: transform var(--dur) var(--ease);
	}
	details[open] .chev {
		transform: rotate(90deg);
	}
	.title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.title.mono {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-weight: var(--fw-regular);
	}
	.tone-warning .title,
	.tone-danger .title {
		color: var(--tone-fg);
	}
	.meta {
		margin-left: auto;
		color: var(--text-3);
		font-size: var(--fs-xs);
		font-weight: var(--fw-regular);
		white-space: nowrap;
	}
	.body {
		border-top: 1px solid var(--border);
	}
</style>
