<script lang="ts">
	import { ArrowLeft, ListX } from 'lucide-svelte';
	import { page } from '$app/state';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import { duration, tokens } from '#lib/format.ts';
	import { outcomeMeta, roleLabel, stageMeta } from '#lib/meta.ts';
	import type { Role, Turn } from '#lib/types.ts';
	import type { LayoutProps } from './$types';

	let { data, params, children }: LayoutProps = $props();

	const base = $derived(`/tasks/${params.owner}/${params.repo}/${params.issue}`);
	const current = $derived(Number(page.params.turn));

	let only = $state<'all' | 'problems'>('all');
	let role = $state<Role | 'all'>('all');
	let query = $state('');

	function filter(turns: Turn[]) {
		const q = query.trim().toLowerCase();
		return turns
			.filter((t) => only === 'all' || t.outcome !== 'ok')
			.filter((t) => role === 'all' || t.role === role)
			.filter((t) => !q || `${t.n} ${t.agent} ${t.profile} ${t.stage} ${t.outcome}`.toLowerCase().includes(q))
			.reverse();
	}
	const sum = (turns: Turn[], f: (t: Turn) => number) => turns.reduce((a, t) => a + f(t), 0);
</script>

<svelte:head><title>Run diagnostics · {params.repo}#{params.issue} · Concurro</title></svelte:head>

<PageHeader title="Run diagnostics" subtitle="Every model call for this task: what it was asked, what it did and where it ran.">
	{#snippet eyebrow()}<span class="mono">{params.owner}/{params.repo}#{params.issue}</span>{/snippet}
	{#snippet actions()}<Button icon={ArrowLeft} href={base}>Back to task</Button>{/snippet}
</PageHeader>

{#await data.result}
	<div class="panes">
		<div class="list"><div class="pad"><Skeleton rows={10} /></div></div>
		<div class="detail"><Skeleton rows={12} /></div>
	</div>
{:then { turns }}
	{@const shown = filter(turns)}
	<dl class="stats num">
		<div><dt>Turns</dt><dd>{turns.length}</dd></div>
		<div><dt>Not ok</dt><dd>{turns.filter((t) => t.outcome !== 'ok').length}</dd></div>
		<div><dt>Input tokens</dt><dd>{tokens(sum(turns, (t) => t.tokens.input))}</dd></div>
		<div><dt>Output tokens</dt><dd>{tokens(sum(turns, (t) => t.tokens.output))}</dd></div>
		<div><dt>Agent time</dt><dd>{duration(sum(turns, (t) => t.durationMs))}</dd></div>
	</dl>
	<div class="panes">
		<aside class="list" aria-label="Turns">
			<div class="filters">
				<input type="search" placeholder="Filter turns" aria-label="Filter turns" bind:value={query} />
				<div class="row">
					<div class="seg" role="group" aria-label="Outcome filter">
						<button class:on={only === 'all'} aria-pressed={only === 'all'} onclick={() => (only = 'all')}>All</button>
						<button class:on={only === 'problems'} aria-pressed={only === 'problems'} onclick={() => (only = 'problems')}>Not ok</button>
					</div>
					<select aria-label="Role filter" bind:value={role}>
						<option value="all">All roles</option>
						{#each Object.entries(roleLabel) as [value, label]}<option {value}>{label}</option>{/each}
					</select>
				</div>
			</div>
			{#if shown.length}
				<ol>
					{#each shown as t (t.n)}
						<li>
							<a href="{base}/turns/{t.n}" class:active={t.n === current} aria-current={t.n === current ? 'page' : undefined}>
								<span class="n num">{t.n}</span>
								<span class="main">
									<span class="top"><span class="mono agent">{t.agent}</span><Badge plain meta={outcomeMeta[t.outcome]} mono /></span>
									<span class="sub num">
										<span>{stageMeta[t.stage].label}</span><span class="mono">{t.profile}</span><span>{duration(t.durationMs)}</span><span>{tokens(t.tokens.input + t.tokens.output)} tok</span>
									</span>
								</span>
							</a>
						</li>
					{/each}
				</ol>
			{:else}
				<EmptyState icon={ListX} title={turns.length ? 'No turns match' : 'No turns yet'} text={turns.length ? 'Clear the filters to see all turns.' : 'Turns appear when the first agent runs.'} />
			{/if}
		</aside>
		<section class="detail" aria-label="Turn detail">{@render children()}</section>
	</div>
{:catch error}
	<ErrorState {error} />
{/await}

<style>
	.stats {
		display: flex;
		flex-wrap: wrap;
		gap: var(--s-2) var(--s-6);
		margin: 0;
		padding: var(--s-3) var(--s-4);
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	.stats dt {
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.stats dd {
		margin: 0;
		font-size: var(--fs-lg);
		font-weight: var(--fw-semibold);
	}
	.panes {
		display: grid;
		grid-template-columns: 340px minmax(0, 1fr);
		gap: var(--s-4);
		align-items: start;
	}
	.list {
		position: sticky;
		top: calc(var(--topbar-h) + var(--s-4));
		display: flex;
		flex-direction: column;
		max-height: calc(100dvh - var(--topbar-h) - 2 * var(--s-4));
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
		overflow: hidden;
	}
	.pad {
		padding: var(--s-4);
	}
	.filters {
		display: grid;
		gap: var(--s-2);
		padding: var(--s-3);
		border-bottom: 1px solid var(--border);
	}
	.row {
		display: flex;
		gap: var(--s-2);
	}
	input[type='search'],
	select {
		height: 28px;
		padding: 0 var(--s-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		background: var(--surface);
		font-size: var(--fs-sm);
		min-width: 0;
	}
	select {
		flex: 1;
	}
	.seg {
		display: flex;
		flex: none;
		border: 1px solid var(--border-strong);
		border-radius: var(--r-md);
		overflow: hidden;
	}
	.seg button {
		padding: 0 var(--s-2);
		border: 0;
		background: var(--surface);
		color: var(--text-2);
		font-size: var(--fs-xs);
		cursor: pointer;
	}
	.seg button + button {
		border-left: 1px solid var(--border-strong);
	}
	.seg button.on {
		background: var(--accent-soft);
		color: var(--accent-text);
		font-weight: var(--fw-semibold);
	}
	.seg button:focus-visible {
		outline-offset: -2px;
	}
	ol {
		margin: 0;
		padding: 0;
		list-style: none;
		overflow-y: auto;
	}
	li a {
		display: flex;
		gap: var(--s-3);
		padding: var(--s-2) var(--s-3);
		border-bottom: 1px solid var(--border);
		border-left: 2px solid transparent;
		color: var(--text);
	}
	li:last-child a {
		border-bottom: 0;
	}
	li a:hover {
		background: var(--surface-2);
		text-decoration: none;
	}
	li a.active {
		border-left-color: var(--accent);
		background: var(--accent-soft);
	}
	li a.active .n,
	li a.active .sub {
		color: var(--text-2);
	}
	li a:focus-visible {
		outline-offset: -2px;
	}
	.n {
		flex: none;
		width: 22px;
		color: var(--text-3);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		text-align: right;
		line-height: 20px;
	}
	.main {
		display: grid;
		flex: 1;
		min-width: 0;
	}
	.top {
		display: flex;
		justify-content: space-between;
		gap: var(--s-2);
	}
	.agent {
		font-weight: var(--fw-medium);
	}
	.sub {
		display: flex;
		flex-wrap: wrap;
		gap: 0 var(--s-2);
		color: var(--text-3);
		font-size: var(--fs-xs);
	}
	.detail {
		min-width: 0;
		padding: var(--s-4);
		border: 1px solid var(--border);
		border-radius: var(--r-lg);
		background: var(--surface);
	}
	@media (max-width: 1000px) {
		.panes {
			grid-template-columns: minmax(0, 1fr);
		}
		.list {
			position: static;
			max-height: 300px;
		}
	}
</style>
