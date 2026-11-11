<script lang="ts">
	import { ExternalLink, GitPullRequest } from 'lucide-svelte';
	import { relTime } from '#lib/format.ts';
	import { findingMeta, isResolved, openFindings, verdictMeta } from '#lib/meta.ts';
	import type { Severity, Task, Tone } from '#lib/types.ts';
	import Badge from '../Badge.svelte';
	import DataTable from '../DataTable.svelte';
	import EmptyState from '../EmptyState.svelte';
	import Inline from '../Inline.svelte';
	import Panel from '../Panel.svelte';

	let { task }: { task: Task } = $props();

	let picked = $state<number>();
	let showResolved = $state(true);
	const round = $derived(task.rounds.find((r) => r.round === picked) ?? task.rounds.at(-1));
	const latest = $derived(task.rounds.at(-1)?.round);
	const findings = $derived(task.findings.filter((f) => showResolved || !isResolved(f.status)));
	const severityTone: Record<Severity, Tone> = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };
</script>

<Panel title="PR review" meta={task.pr ? `#${task.pr.number} · ${openFindings(task.findings)} open of ${task.findings.length} findings` : undefined} flush id="pr-review">
	{#if round}
		<div class="rounds" role="group" aria-label="Review round">
			{#each task.rounds as r (r.round)}
				<button class:on={r.round === round.round} aria-pressed={r.round === round.round} onclick={() => (picked = r.round)}>
					<span>Round {r.round}</span>
					<span class="mono sha">{r.headSha}</span>
					{#if r.round === latest}<span class="cur">current head</span>{/if}
				</button>
			{/each}
		</div>
		<div class="votes">
			{#each round.votes as v}
				<div class="vote">
					<span class="mono agent">{v.agent}</span>
					<span class="mono muted">{v.profile}</span>
					<Badge meta={verdictMeta[v.verdict]} />
				</div>
			{/each}
			<span class="muted when">Reviewed {relTime(round.at)}</span>
		</div>

		<div class="findings-head">
			<h3>Findings</h3>
			<label><input type="checkbox" bind:checked={showResolved} /> Show resolved</label>
		</div>
		{#if findings.length}
			<DataTable label="Findings">
				<thead>
					<tr><th>ID</th><th>Status</th><th>Severity</th><th>Finding</th><th><span class="sr-only">Thread</span></th></tr>
				</thead>
				<tbody>
					{#each findings as f (f.id)}
						<tr class:retired={isResolved(f.status)}>
							<td class="mono nowrap">{f.id}</td>
							<td><Badge meta={findingMeta[f.status]} /></td>
							<td><Badge plain tone={severityTone[f.severity]}>{f.severity}</Badge></td>
							<td class="title">
								<p class="ftitle"><Inline text={f.title} /></p>
								<p class="sub"><span class="mono">{f.path}:{f.line}</span> · <Inline text={f.detail} /></p>
								<p class="sub">Raised by <span class="mono">{f.raisedBy}</span> in round {f.raisedRound}</p>
							</td>
							<td class="nowrap"><a href="#pr-review" title="GitHub thread {f.thread}" aria-label="Open GitHub thread {f.thread}"><ExternalLink size={14} /></a></td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
			<p class="rule muted">Only the reviewer who raised a finding can mark it fixed or obsolete. Every open or withdrawn finding blocks the merge, whatever its severity.</p>
		{:else}
			<EmptyState title="No findings" text={task.findings.length ? 'All findings are resolved. Tick “Show resolved” to see them.' : 'Reviewers raised no findings on this pull request.'} />
		{/if}
	{:else}
		<EmptyState icon={GitPullRequest} title="No PR review yet" text="Review rounds start when the implementation is published as a draft pull request." />
	{/if}
</Panel>

<style>
	.rounds {
		display: flex;
		gap: var(--s-1);
		padding: var(--s-2) var(--s-4) 0;
		border-bottom: 1px solid var(--border);
		overflow-x: auto;
	}
	.rounds button {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-2);
		margin-bottom: -1px;
		border: 0;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--text-2);
		font-size: var(--fs-sm);
		font-weight: var(--fw-medium);
		white-space: nowrap;
		cursor: pointer;
	}
	.rounds button.on {
		border-bottom-color: var(--accent);
		color: var(--text);
	}
	.sha {
		color: var(--text-3);
		font-weight: var(--fw-regular);
	}
	.cur {
		padding: 0 6px;
		border-radius: var(--r-full);
		background: var(--surface-3);
		color: var(--text-2);
		font-size: var(--fs-2xs);
	}
	.votes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--s-2) var(--s-3);
		padding: var(--s-3) var(--s-4);
		border-bottom: 1px solid var(--border);
	}
	.vote {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		padding: var(--s-1) var(--s-2);
		border: 1px solid var(--border);
		border-radius: var(--r-md);
		font-size: var(--fs-sm);
	}
	.agent {
		font-weight: var(--fw-semibold);
	}
	.when {
		margin-left: auto;
		font-size: var(--fs-xs);
	}
	.findings-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--s-2) var(--s-4);
	}
	.findings-head label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--text-2);
		font-size: var(--fs-sm);
		cursor: pointer;
	}
	.findings-head input {
		accent-color: var(--accent);
	}
	.ftitle {
		font-weight: var(--fw-medium);
	}
	.retired .ftitle {
		color: var(--text-2);
		font-weight: var(--fw-regular);
	}
	td a {
		display: inline-flex;
		color: var(--text-3);
	}
	.rule {
		padding: var(--s-2) var(--s-4);
		border-top: 1px solid var(--border);
		font-size: var(--fs-xs);
	}
</style>
