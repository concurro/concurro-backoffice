<script lang="ts">
	let { label, used, max, unit = '' }: { label: string; used: number; max: number; unit?: string } = $props();
	const ratio = $derived(max ? Math.min(1, used / max) : 0);
	const tone = $derived(ratio >= 1 ? 'danger' : ratio >= 0.8 ? 'warning' : 'accent');
</script>

<div class="meter tone-{tone}">
	<div class="row">
		<span class="label">{label}</span>
		<span class="value num"><strong>{used.toLocaleString()}</strong> / {max.toLocaleString()}{unit ? ` ${unit}` : ''}</span>
	</div>
	<div class="track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={used}>
		<div class="fill" style:width="{ratio * 100}%"></div>
	</div>
	{#if ratio >= 1}<p class="hint">Budget exhausted</p>{:else if ratio >= 0.8}<p class="hint">{max - used} remaining</p>{/if}
</div>

<style>
	.row {
		display: flex;
		justify-content: space-between;
		gap: var(--s-3);
		font-size: var(--fs-sm);
	}
	.label {
		color: var(--text-2);
	}
	.value {
		color: var(--text-3);
	}
	.value strong {
		color: var(--text);
		font-weight: var(--fw-semibold);
	}
	.track {
		height: 6px;
		margin-top: 6px;
		border-radius: var(--r-full);
		background: var(--surface-3);
		overflow: hidden;
	}
	.fill {
		height: 100%;
		border-radius: var(--r-full);
		background: var(--tone-solid);
	}
	.hint {
		margin-top: 4px;
		color: var(--tone-fg);
		font-size: var(--fs-xs);
	}
</style>
