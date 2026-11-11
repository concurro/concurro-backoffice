<script lang="ts">
	import { X } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { dismiss, toasts } from '#lib/state/toast.svelte.ts';
</script>

<div class="toasts" aria-live="polite">
	{#each toasts as t (t.id)}
		<div class="toast tone-{t.tone}" transition:fly={{ y: 8, duration: 140 }}>
			<span class="dot" aria-hidden="true"></span>
			<span class="text">{t.text}</span>
			<span class="local">mock · local only</span>
			<button onclick={() => dismiss(t.id)} aria-label="Dismiss"><X size={14} /></button>
		</div>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		right: var(--s-4);
		bottom: var(--s-4);
		z-index: 60;
		display: grid;
		gap: var(--s-2);
		max-width: calc(100vw - 2 * var(--s-4));
	}
	.toast {
		display: flex;
		align-items: center;
		gap: var(--s-3);
		padding: var(--s-2) var(--s-3);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		background: var(--surface);
		box-shadow: var(--shadow-pop);
		font-size: var(--fs-sm);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--tone-solid);
	}
	.local {
		color: var(--text-3);
		font-size: var(--fs-2xs);
	}
	button {
		display: flex;
		padding: 2px;
		border: 0;
		background: none;
		color: var(--text-3);
		cursor: pointer;
	}
</style>
