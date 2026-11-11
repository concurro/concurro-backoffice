<script lang="ts">
	/** Monospaced block. Long content is truncated to `maxLines` with a toggle; `json` adds highlighting. */
	let { text, maxLines = 0, json = false, flush = false }: { text: string; maxLines?: number; json?: boolean; flush?: boolean } = $props();

	let expanded = $state(false);
	const lines = $derived(text.split('\n'));
	const truncated = $derived(maxLines > 0 && lines.length > maxLines);
	const shown = $derived(truncated && !expanded ? lines.slice(0, maxLines).join('\n') : text);

	type Tok = { cls: string; text: string };
	const pattern = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g;

	function tokenize(src: string): Tok[] {
		const out: Tok[] = [];
		let last = 0;
		for (const m of src.matchAll(pattern)) {
			if (m.index > last) out.push({ cls: '', text: src.slice(last, m.index) });
			if (m[1]) {
				out.push({ cls: m[2] ? 'key' : 'string', text: m[1] });
				if (m[2]) out.push({ cls: '', text: m[2] });
			} else out.push({ cls: m[3] ? 'keyword' : 'number', text: m[0] });
			last = m.index + m[0].length;
		}
		if (last < src.length) out.push({ cls: '', text: src.slice(last) });
		return out;
	}
</script>

<div class="code" class:flush>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable region must be keyboard reachable) -->
	<pre tabindex="0">{#if json}{#each tokenize(shown) as t}{#if t.cls}<span class={t.cls}>{t.text}</span>{:else}{t.text}{/if}{/each}{:else}{shown}{/if}</pre>
	{#if truncated}
		<button class="more" onclick={() => (expanded = !expanded)}>
			{expanded ? 'Show less' : `Show ${lines.length - maxLines} more lines`}
		</button>
	{/if}
</div>

<style>
	.code {
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--code-bg);
		overflow: hidden;
	}
	.code.flush {
		border: 0;
		border-radius: 0 0 var(--r-md) var(--r-md);
	}
	pre {
		margin: 0;
		padding: var(--s-3);
		overflow-x: auto;
		font-size: var(--fs-xs);
		line-height: 1.6;
		color: var(--text);
		tab-size: 4;
	}
	.key {
		color: var(--syntax-key);
	}
	.string {
		color: var(--syntax-string);
	}
	.number {
		color: var(--syntax-number);
	}
	.keyword {
		color: var(--syntax-keyword);
	}
	.more {
		display: block;
		width: 100%;
		padding: 6px var(--s-3);
		border: 0;
		border-top: 1px solid var(--border);
		background: var(--surface-2);
		color: var(--accent-text);
		font-size: var(--fs-xs);
		font-weight: var(--fw-medium);
		text-align: left;
		cursor: pointer;
	}
	.more:hover {
		background: var(--surface-3);
	}
</style>
