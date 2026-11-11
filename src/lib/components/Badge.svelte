<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconType, Meta } from '#lib/meta.ts';
	import type { Tone } from '#lib/types.ts';

	interface Props {
		/** Shorthand: tone, icon and label from a status table. */
		meta?: Meta;
		tone?: Tone;
		icon?: IconType;
		/** Borderless variant: icon and text only. */
		plain?: boolean;
		mono?: boolean;
		title?: string;
		children?: Snippet;
	}
	let { meta, tone = meta?.tone ?? 'neutral', icon = meta?.icon, plain = false, mono = false, title, children }: Props = $props();
	const Icon = $derived(icon);
</script>

<span class="badge tone-{tone}" class:plain class:mono {title}>
	{#if Icon}<Icon size={12} strokeWidth={2.25} aria-hidden="true" />{:else}<span class="dot" aria-hidden="true"></span>{/if}
	{#if children}{@render children()}{:else}{meta?.label}{/if}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 20px;
		padding: 0 7px;
		border: 1px solid var(--tone-border);
		border-radius: var(--r-full);
		background: var(--tone-bg);
		color: var(--tone-fg);
		font-size: var(--fs-xs);
		font-weight: var(--fw-medium);
		line-height: 1;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.plain {
		padding: 0;
		border: 0;
		background: none;
	}
	.mono {
		font-family: var(--font-mono);
		font-size: var(--fs-2xs);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--tone-solid);
	}
</style>
