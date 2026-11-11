<script lang="ts">
	/** Renders text with `backtick` spans as inline code. */
	let { text }: { text: string } = $props();
	const parts = $derived(text.split('`'));
</script>

{#each parts as part, i}{#if i % 2}<code>{part}</code>{:else}{part}{/if}{/each}

<style>
	code {
		padding: 1px 4px;
		border-radius: var(--r-sm);
		background: var(--surface-3);
		color: var(--text);
	}
</style>
