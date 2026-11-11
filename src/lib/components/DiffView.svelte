<script lang="ts">
	import type { DiffLine } from '#lib/format.ts';

	let { lines, label = 'Diff' }: { lines: DiffLine[]; label?: string } = $props();
	const marker = { add: '+', del: '−', ctx: ' ', hunk: '', file: '' } as const;
	const adds = $derived(lines.filter((l) => l.kind === 'add').length);
	const dels = $derived(lines.filter((l) => l.kind === 'del').length);
</script>

<div class="diff" role="group" aria-label={label}>
	<div class="stat num">
		<span class="add">+{adds}</span> <span class="del">−{dels}</span>
	</div>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable region must be keyboard reachable) -->
	<div class="scroll" tabindex="0" role="region" aria-label="{label} content">
		<table>
			<tbody>
				{#each lines as line}
					{#if line.kind === 'file'}
						<tr class="file"><td colspan="4">{line.text}</td></tr>
					{:else if line.kind === 'hunk'}
						<tr class="hunk"><td colspan="4">{line.text}</td></tr>
					{:else}
						<tr class={line.kind}>
							<td class="ln">{line.a ?? ''}</td>
							<td class="ln">{line.b ?? ''}</td>
							<td class="mk" aria-label={line.kind === 'add' ? 'added' : line.kind === 'del' ? 'removed' : undefined}>{marker[line.kind]}</td>
							<td class="tx">{line.text}</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.diff {
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--code-bg);
		overflow: hidden;
	}
	.stat {
		padding: 6px var(--s-3);
		border-bottom: 1px solid var(--border);
		background: var(--surface-2);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
	}
	.stat .add {
		color: var(--success-fg);
	}
	.stat .del {
		color: var(--danger-fg);
	}
	.scroll {
		overflow-x: auto;
	}
	table {
		min-width: 100%;
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		line-height: 1.6;
	}
	td {
		padding: 0 var(--s-2);
		white-space: pre;
	}
	.ln {
		width: 1%;
		min-width: 36px;
		color: var(--text-3);
		text-align: right;
		user-select: none;
		font-variant-numeric: tabular-nums;
	}
	.mk {
		width: 1%;
		padding: 0 2px 0 var(--s-2);
		color: var(--text-3);
		user-select: none;
	}
	.tx {
		padding-right: var(--s-4);
	}
	.add {
		background: var(--success-bg);
	}
	.add .mk {
		color: var(--success-fg);
	}
	.del {
		background: var(--danger-bg);
	}
	.del .mk {
		color: var(--danger-fg);
	}
	.add .ln,
	.del .ln {
		color: var(--text-2);
	}
	.file td {
		padding: 6px var(--s-3);
		border-block: 1px solid var(--border);
		background: var(--surface-2);
		color: var(--text);
		font-weight: var(--fw-semibold);
	}
	tr.file:first-child td {
		border-top: 0;
	}
	.hunk td {
		padding: 2px var(--s-3);
		background: var(--info-bg);
		color: var(--info-fg);
	}
</style>
