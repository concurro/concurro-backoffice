<script lang="ts">
	import Inline from './Inline.svelte';

	/** Minimal renderer for plan text: `## ` headings, `- ` and `1. ` lists, paragraphs. */
	let { text }: { text: string } = $props();

	type Block = { kind: 'h' | 'p'; text: string } | { kind: 'ul' | 'ol'; items: string[] };
	const blocks = $derived.by(() => {
		const out: Block[] = [];
		for (const line of text.split('\n')) {
			const last = out.at(-1);
			if (!line.trim()) continue;
			if (line.startsWith('## ')) out.push({ kind: 'h', text: line.slice(3) });
			else if (/^- /.test(line)) {
				if (last?.kind === 'ul') last.items.push(line.slice(2));
				else out.push({ kind: 'ul', items: [line.slice(2)] });
			} else if (/^\d+\. /.test(line)) {
				const item = line.replace(/^\d+\. /, '');
				if (last?.kind === 'ol') last.items.push(item);
				else out.push({ kind: 'ol', items: [item] });
			} else out.push({ kind: 'p', text: line });
		}
		return out;
	});
</script>

<div class="prose">
	{#each blocks as b}
		{#if b.kind === 'h'}
			<h3>{b.text}</h3>
		{:else if b.kind === 'p'}
			<p><Inline text={b.text} /></p>
		{:else if 'items' in b}
			<svelte:element this={b.kind}>
				{#each b.items as item}<li><Inline text={item} /></li>{/each}
			</svelte:element>
		{/if}
	{/each}
</div>

<style>
	.prose {
		max-width: 78ch;
		color: var(--text);
		font-size: var(--fs-sm);
		line-height: 1.6;
	}
	h3 {
		margin: var(--s-4) 0 var(--s-1);
		color: var(--text-3);
		font-size: var(--fs-2xs);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	h3:first-child {
		margin-top: 0;
	}
	ul,
	ol {
		margin: 0;
		padding-left: var(--s-5);
	}
	li {
		margin: 2px 0;
	}
	li::marker {
		color: var(--text-3);
	}
</style>
