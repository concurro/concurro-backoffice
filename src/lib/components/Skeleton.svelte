<script lang="ts">
	/** Loading placeholder: `rows` bars of varying width, or a single block of `height`. */
	let { rows = 3, height }: { rows?: number; height?: number } = $props();
	const widths = [92, 78, 85, 64, 88, 71];
</script>

<div class="skeleton" aria-busy="true" aria-label="Loading">
	{#if height}
		<div class="bar" style:height="{height}px"></div>
	{:else}
		{#each { length: rows } as _, i}
			<div class="bar" style:width="{widths[i % widths.length]}%"></div>
		{/each}
	{/if}
</div>

<style>
	.skeleton {
		display: grid;
		gap: var(--s-3);
	}
	.bar {
		height: 14px;
		border-radius: var(--r-sm);
		background: linear-gradient(90deg, var(--surface-3) 25%, var(--surface-2) 50%, var(--surface-3) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.4s linear infinite;
	}
	@keyframes shimmer {
		to {
			background-position: -200% 0;
		}
	}
</style>
