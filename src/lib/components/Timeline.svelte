<script lang="ts">
	import { absTime, relTime } from '#lib/format.ts';
	import type { TimelineEvent } from '#lib/types.ts';
	import Inline from './Inline.svelte';

	let { events, turnHref }: { events: TimelineEvent[]; turnHref?: (turn: number) => string } = $props();
	const ordered = $derived([...events].sort((a, b) => b.at.localeCompare(a.at)));
</script>

<ol class="timeline">
	{#each ordered as e (e.id)}
		<li class="tone-{e.tone ?? 'neutral'}">
			<span class="dot" aria-hidden="true"></span>
			<div class="body">
				<p><span class="actor">{e.actor}</span> <Inline text={e.text} /></p>
				<p class="meta">
					<time datetime={e.at} title={absTime(e.at)}>{relTime(e.at)}</time>
					<span class="kind">{e.kind}</span>
					{#if e.turn && turnHref}<a href={turnHref(e.turn)}>Turn {e.turn}</a>{/if}
				</p>
			</div>
		</li>
	{/each}
</ol>

<style>
	.timeline {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		position: relative;
		display: flex;
		gap: var(--s-3);
		padding-bottom: var(--s-3);
		font-size: var(--fs-sm);
	}
	/* Connector between dots. */
	li::before {
		content: '';
		position: absolute;
		top: 14px;
		bottom: -4px;
		left: 4px;
		width: 1px;
		background: var(--border);
	}
	li:last-child::before {
		display: none;
	}
	li:last-child {
		padding-bottom: 0;
	}
	.dot {
		flex: none;
		width: 9px;
		height: 9px;
		margin-top: 6px;
		border: 2px solid var(--surface);
		border-radius: 50%;
		background: var(--tone-solid);
		box-shadow: 0 0 0 1px var(--tone-border);
		z-index: 1;
	}
	.body {
		min-width: 0;
	}
	.actor {
		font-weight: var(--fw-medium);
	}
	.meta {
		display: flex;
		gap: var(--s-2);
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.kind::before,
	.meta a::before {
		content: '·';
		margin-right: var(--s-2);
		color: var(--text-3);
	}
</style>
