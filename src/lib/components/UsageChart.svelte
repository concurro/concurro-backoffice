<script lang="ts">
	import type { UsageRow } from '#lib/types.ts';

	/** Horizontal stacked bars: thousands of tokens per task, split by model profile. */
	let { rows, profiles }: { rows: UsageRow[]; profiles: string[] } = $props();

	const ROW = 30;
	const LABEL = 132;
	const VALUE = 56;
	const WIDTH = 640;
	const plot = WIDTH - LABEL - VALUE;
	const total = (r: UsageRow) => profiles.reduce((a, p) => a + (r.byProfile[p] ?? 0), 0);
	const max = $derived(Math.max(...rows.map(total), 1));
	const fmt = (k: number) => (k >= 1000 ? `${(k / 1000).toFixed(2)}M` : `${k}k`);

	function segments(r: UsageRow) {
		let x = 0;
		return profiles.map((p, i) => {
			const w = ((r.byProfile[p] ?? 0) / max) * plot;
			const seg = { p, i, x, w, value: r.byProfile[p] ?? 0 };
			x += w;
			return seg;
		});
	}
</script>

<figure>
	<ul class="legend">
		{#each profiles as p, i}<li><span class="swatch s{i}" aria-hidden="true"></span><span class="mono">{p}</span></li>{/each}
	</ul>
	<svg viewBox="0 0 {WIDTH} {rows.length * ROW}" role="img" aria-label="Token usage by task and model profile">
		{#each rows as r, y}
			<g transform="translate(0 {y * ROW})">
				<text class="label" x="0" y={ROW / 2}>{r.task}</text>
				<rect class="track" x={LABEL} y="8" width={plot} height={ROW - 16} rx="2" />
				{#each segments(r) as s}
					{#if s.w > 0}
						<rect class="s{s.i}" x={LABEL + s.x} y="8" width={Math.max(s.w - 1, 1)} height={ROW - 16} rx="2"><title>{r.task} · {s.p}: {fmt(s.value)} tokens</title></rect>
					{/if}
				{/each}
				<text class="value" x={WIDTH} y={ROW / 2}>{fmt(total(r))}</text>
			</g>
		{/each}
	</svg>
	<figcaption class="muted">Tokens over the last 7 days. Hover a segment for the exact value.</figcaption>
</figure>

<style>
	figure {
		margin: 0;
	}
	svg {
		display: block;
		width: 100%;
		max-width: 760px;
		height: auto;
	}
	text {
		dominant-baseline: central;
		font-size: 11px;
		font-family: var(--font-mono);
		fill: var(--text-2);
	}
	.value {
		text-anchor: end;
		fill: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.track {
		fill: var(--surface-2);
	}
	/* Sequential ramp of the accent hue: darker means the costlier profile. */
	.s0 {
		fill: var(--accent);
		background: var(--accent);
	}
	.s1 {
		fill: var(--info-solid);
		background: var(--info-solid);
		opacity: 0.62;
	}
	.s2 {
		fill: var(--neutral-solid);
		background: var(--neutral-solid);
		opacity: 0.45;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-4);
		margin: 0 0 var(--s-3);
		padding: 0;
		list-style: none;
		font-size: var(--fs-xs);
	}
	.legend li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}
	figcaption {
		margin-top: var(--s-2);
		font-size: var(--fs-xs);
	}
</style>
