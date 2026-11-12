<script lang="ts">
	import { Check } from 'lucide-svelte';
	import { isMerged, mergedEarly, stepHasRecord, stepIndex, steps, taskStageMeta } from '#lib/meta.ts';
	import type { Task } from '#lib/types.ts';

	/** `selected` is the step whose details the page shows; `onselect` picks another. */
	let { task, selected, onselect }: { task: Task; selected?: number; onselect?: (step: number) => void } = $props();

	const parked = $derived(task.stage !== task.atStage || !!task.paused);
	const done = $derived((isMerged(task.stage) && !mergedEarly(task)) || (task.stage === 'gates' && task.pr?.ready));
	const current = $derived(stepIndex(task.atStage));
	const meta = $derived(taskStageMeta(task));
	const ParkedIcon = $derived(meta.icon);

	function state(i: number): 'done' | 'current' | 'parked' | 'rerun' | 'todo' {
		if (i < current || (i === current && done)) return 'done';
		if (i === current) return parked ? 'parked' : 'current';
		return stepHasRecord(task, i) ? 'rerun' : 'todo';
	}
	const words = { done: 'Done', rerun: 'Rerun pending', todo: 'Not started' };
</script>

<ol class="stepper" aria-label="Task progress">
	{#each steps as step, i}
		{@const s = state(i)}
		<li class="{s} {s === 'parked' ? `tone-${meta.tone}` : ''}" class:selected={i === selected} aria-current={i === current ? 'step' : undefined}>
			<button type="button" aria-pressed={onselect ? i === selected : undefined} disabled={!onselect} onclick={() => onselect?.(i)}>
				<span class="marker" aria-hidden="true">
					{#if s === 'done'}<Check size={12} strokeWidth={3} />{:else if s === 'parked'}<ParkedIcon size={12} strokeWidth={2.5} />{:else}{i + 1}{/if}
				</span>
				<span class="text">
					<span class="label">{step.label}</span>
					<span class="state">{s === 'current' || s === 'parked' ? meta.label : words[s]}</span>
				</span>
			</button>
		</li>
	{/each}
</ol>

<style>
	.stepper {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
		overflow: hidden;
	}
	li {
		position: relative;
		border-right: 1px solid var(--border);
		min-width: 0;
	}
	button {
		display: flex;
		align-items: center;
		gap: var(--s-2);
		width: 100%;
		height: 100%;
		padding: var(--s-3);
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	button:disabled {
		cursor: default;
	}
	button:enabled:hover {
		background: color-mix(in srgb, var(--text) 5%, transparent);
	}
	button:focus-visible {
		outline-offset: -2px;
	}
	/* The step whose details are shown: a rail along the top edge. */
	li.selected::before {
		content: '';
		position: absolute;
		inset: 0 0 auto 0;
		height: 2px;
		background: var(--text-2);
	}
	li.selected .label {
		font-weight: var(--fw-semibold);
	}
	li:last-child {
		border-right: 0;
	}
	/* Progress rail along the bottom edge. */
	li::after {
		content: '';
		position: absolute;
		inset: auto 0 0 0;
		height: 2px;
		background: transparent;
	}
	.done::after {
		background: var(--success-solid);
	}
	.current::after {
		background: var(--accent);
	}
	.parked::after {
		background: var(--tone-solid);
	}
	.marker {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 22px;
		height: 22px;
		border: 1px solid var(--border-strong);
		border-radius: 50%;
		color: var(--text-3);
		font-size: var(--fs-2xs);
		font-weight: var(--fw-semibold);
		font-variant-numeric: tabular-nums;
	}
	.done .marker {
		border-color: var(--success-border);
		background: var(--success-bg);
		color: var(--success-fg);
	}
	.current .marker {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}
	.parked .marker {
		border-color: var(--tone-border);
		background: var(--tone-bg);
		color: var(--tone-fg);
	}
	.current {
		background: var(--accent-soft);
	}
	.parked {
		background: var(--tone-bg);
	}
	.text {
		display: grid;
		min-width: 0;
	}
	.label {
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.todo .label,
	.rerun .label {
		color: var(--text-3);
	}
	.rerun .marker {
		border-style: dashed;
	}
	.rerun .state {
		font-style: italic;
	}
	.state {
		color: var(--text-3);
		font-size: var(--fs-2xs);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.current .state {
		color: var(--accent-text);
	}
	.parked .state {
		color: var(--tone-fg);
	}
	@media (max-width: 860px) {
		.stepper {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		li:nth-child(3) {
			border-right: 0;
		}
		li:nth-child(-n + 3) {
			border-bottom: 1px solid var(--border);
		}
	}
	@media (max-width: 480px) {
		.stepper {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		li {
			border-bottom: 1px solid var(--border);
		}
		li:nth-child(3) {
			border-right: 1px solid var(--border);
		}
		li:nth-child(2n) {
			border-right: 0;
		}
		li:nth-last-child(-n + 2) {
			border-bottom: 0;
		}
	}
</style>
