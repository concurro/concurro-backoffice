<script lang="ts">
	import { ScanSearch } from 'lucide-svelte';
	import { relTime } from '#lib/format.ts';
	import { verdictMeta } from '#lib/meta.ts';
	import type { Task } from '#lib/types.ts';
	import Badge from '../Badge.svelte';
	import EmptyState from '../EmptyState.svelte';
	import Inline from '../Inline.svelte';
	import Panel from '../Panel.svelte';

	let { task }: { task: Task } = $props();
	const generations = $derived([...task.designReview].reverse());
	const version = (planId: string) => task.plans.find((p) => p.id === planId)?.version;
</script>

<Panel title="Design review" meta={generations.length ? `${generations.length} generation${generations.length > 1 ? 's' : ''}` : undefined} flush id="design-review">
	{#each generations as gen, i (gen.generation)}
		<details open={i === 0}>
			<summary>
				<span class="gen">Generation {gen.generation}</span>
				<span class="muted">plan v{version(gen.planId)} <span class="mono">{gen.planId}</span>{#if gen.at} · {relTime(gen.at)}{/if}</span>
				<span class="verdicts">
					{#each gen.reviews as r}<Badge plain meta={verdictMeta[r.verdict]} title="{r.agent}: {verdictMeta[r.verdict].label}"><span class="sr-only">{r.agent}: {verdictMeta[r.verdict].label}</span></Badge>{/each}
				</span>
			</summary>
			{#if gen.reason}<p class="reason"><Inline text={gen.reason} /></p>{/if}
			<div class="reviews">
				{#each gen.reviews as r}
					<article>
						<header>
							<span class="mono agent">{r.agent}</span>
							<span class="mono muted">{r.profile}</span>
							<Badge meta={verdictMeta[r.verdict]} />
						</header>
						{#if r.objections.length}
							<ul>
								{#each r.objections as o (o.id)}
									<li>
										{#if o.resolved === undefined}
											<!-- An archived concern has no ledger identifier to show. -->
											<span class="bullet" aria-hidden="true">•</span>
										{:else}
											<span class="mono oid">{o.id}</span>
										{/if}
										<span class="otext"><Inline text={o.text} /></span>
										{#if o.resolved !== undefined}
											<Badge plain tone={o.resolved ? 'success' : 'warning'}>{o.resolved ? 'Resolved' : 'Open'}</Badge>
										{/if}
									</li>
								{/each}
							</ul>
						{:else}
							<p class="none muted">
								{r.verdict === 'pending' ? 'Review has not finished.' : r.verdict === 'approve' ? 'No objections.' : 'No concerns were recorded.'}
							</p>
						{/if}
					</article>
				{/each}
			</div>
		</details>
	{:else}
		<EmptyState icon={ScanSearch} title="No design review yet" text="Two independent reviewers vote on each plan version and raise objections." />
	{/each}
</Panel>

<style>
	details {
		border-bottom: 1px solid var(--border);
	}
	details:last-child {
		border-bottom: 0;
	}
	summary {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--s-2) var(--s-3);
		padding: var(--s-2) var(--s-4);
		cursor: pointer;
		font-size: var(--fs-sm);
	}
	summary:hover {
		background: var(--surface-2);
	}
	.gen {
		font-weight: var(--fw-semibold);
	}
	.verdicts {
		display: inline-flex;
		gap: var(--s-2);
		margin-left: auto;
	}
	.reason {
		margin: 0;
		padding: 0 var(--s-4) var(--s-2);
		color: var(--text-2);
		font-size: var(--fs-sm);
	}
	.reviews {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--s-3);
		padding: var(--s-1) var(--s-4) var(--s-4);
	}
	article {
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		background: var(--surface);
	}
	article header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--s-2);
		padding: var(--s-2) var(--s-3);
		border-bottom: 1px solid var(--border);
		background: var(--surface-2);
		border-radius: var(--r-md) var(--r-md) 0 0;
		font-size: var(--fs-sm);
	}
	article header :global(.badge) {
		margin-left: auto;
	}
	.agent {
		font-weight: var(--fw-semibold);
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 2px var(--s-2);
		padding: var(--s-2) var(--s-3);
		border-bottom: 1px solid var(--border);
		font-size: var(--fs-sm);
	}
	li:last-child {
		border-bottom: 0;
	}
	.bullet {
		color: var(--text-3);
		line-height: 1.5;
	}
	.oid {
		color: var(--text-3);
	}
	li :global(.badge) {
		grid-column: 2;
	}
	.none {
		padding: var(--s-3);
		font-size: var(--fs-sm);
	}
	@media (max-width: 720px) {
		.reviews {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
