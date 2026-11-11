<script lang="ts">
	import type { Snippet } from 'svelte';
	import { alertMeta } from '#lib/meta.ts';
	import type { AlertTone } from '#lib/types.ts';

	let { tone = 'note', title, children, actions }: { tone?: AlertTone; title: string; children?: Snippet; actions?: Snippet } = $props();
	const meta = $derived(alertMeta[tone]);
	const Icon = $derived(meta.icon);
</script>

<div class="alert tone-{meta.tone}" role={tone === 'caution' || tone === 'warning' ? 'alert' : 'status'}>
	<span class="icon"><Icon size={16} aria-hidden="true" /></span>
	<div class="body">
		<p class="title"><span class="kind">{meta.label}</span>{title}</p>
		{#if children}<div class="text">{@render children()}</div>{/if}
	</div>
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</div>

<style>
	.alert {
		display: flex;
		gap: var(--s-3);
		padding: var(--s-3) var(--s-4);
		border: 1px solid var(--tone-border);
		border-left: 3px solid var(--tone-solid);
		border-radius: var(--r-md);
		background: var(--tone-bg);
	}
	.icon {
		display: flex;
		padding-top: 2px;
		color: var(--tone-fg);
	}
	.body {
		flex: 1;
		min-width: 0;
	}
	.title {
		font-weight: var(--fw-semibold);
		color: var(--text);
	}
	.kind {
		margin-right: var(--s-2);
		color: var(--tone-fg);
		font-size: var(--fs-2xs);
		font-weight: var(--fw-semibold);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.text {
		margin-top: 2px;
		color: var(--text-2);
		font-size: var(--fs-sm);
		max-width: 80ch;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: var(--s-2);
	}
	@media (max-width: 640px) {
		.alert {
			flex-wrap: wrap;
		}
		.actions {
			width: 100%;
			padding-left: 28px;
		}
	}
</style>
