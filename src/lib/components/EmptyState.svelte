<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Inbox } from 'lucide-svelte';
	import type { IconType } from '#lib/meta.ts';

	let { icon = Inbox, title, text, children }: { icon?: IconType; title: string; text?: string; children?: Snippet } = $props();
	const Icon = $derived(icon);
</script>

<div class="empty">
	<span class="icon"><Icon size={18} aria-hidden="true" /></span>
	<p class="title">{title}</p>
	{#if text}<p class="text">{text}</p>{/if}
	{#if children}<div class="action">{@render children()}</div>{/if}
</div>

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--s-1);
		padding: var(--s-6) var(--s-4);
		text-align: center;
	}
	.icon {
		display: flex;
		padding: var(--s-2);
		margin-bottom: var(--s-2);
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface-2);
		color: var(--text-3);
	}
	.title {
		font-weight: var(--fw-medium);
	}
	.text {
		max-width: 46ch;
		color: var(--text-3);
		font-size: var(--fs-sm);
	}
	.action {
		margin-top: var(--s-3);
	}
</style>
