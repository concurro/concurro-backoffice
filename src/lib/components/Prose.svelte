<script lang="ts">
	import Inline from './Inline.svelte';

	/** Minimal renderer for plan and issue text: headings, `-`/`*` and `1.` lists, fenced code, paragraphs. */
	let { text }: { text: string } = $props();

	type Block = { kind: 'h' | 'p' | 'pre'; text: string } | { kind: 'ul' | 'ol'; items: string[] };
	const blocks = $derived.by(() => {
		const out: Block[] = [];
		let code: string[] | null = null;
		for (const line of text.split('\n')) {
			if (/^\s*```/.test(line)) {
				if (code) out.push({ kind: 'pre', text: code.join('\n') });
				code = code ? null : [];
				continue;
			}
			if (code) {
				code.push(line);
				continue;
			}
			const last = out.at(-1);
			if (!line.trim()) continue;
			if (/^#{1,6} /.test(line)) out.push({ kind: 'h', text: line.replace(/^#+ /, '') });
			else if (/^[-*] /.test(line)) {
				if (last?.kind === 'ul') last.items.push(line.slice(2));
				else out.push({ kind: 'ul', items: [line.slice(2)] });
			} else if (/^\d+\. /.test(line)) {
				const item = line.replace(/^\d+\. /, '');
				if (last?.kind === 'ol') last.items.push(item);
				else out.push({ kind: 'ol', items: [item] });
			} else out.push({ kind: 'p', text: line });
		}
		if (code) out.push({ kind: 'pre', text: code.join('\n') });
		return out;
	});
</script>

<div class="prose">
	{#each blocks as b}
		{#if b.kind === 'h'}
			<h3>{b.text}</h3>
		{:else if b.kind === 'p'}
			<p><Inline text={b.text} /></p>
		{:else if b.kind === 'pre'}
			<pre>{b.text}</pre>
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
	pre {
		margin: var(--s-2) 0;
		padding: var(--s-2) var(--s-3);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface-2);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		line-height: 1.5;
		overflow-x: auto;
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
