<script lang="ts">
	import { ExternalLink } from 'lucide-svelte';
	import { api } from '#lib/api/index.ts';
	import { duration } from '#lib/format.ts';
	import type { Tone } from '#lib/types.ts';
	import Badge from '#lib/components/Badge.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';

	let { owner, repo, issue, identifier }: { owner: string; repo: string; issue: number; identifier: string } = $props();
	const result = $derived(api.turnRuns(owner, repo, issue, identifier));
	const tones: Record<string, Tone> = { success: 'success', failure: 'danger', timed_out: 'danger', cancelled: 'warning', action_required: 'warning', in_progress: 'accent' };
</script>

{#await result}
	<Skeleton rows={5} />
{:then { runs, message }}
	{#if message}<EmptyState title="Run details unavailable" text={message} />{/if}
	{#each runs as run (`${run.id}/${run.attempt}`)}
		<dl class="facts num">
			<div><dt>Actions run</dt><dd><a href={run.url} target="_blank" rel="noreferrer" class="mono">{run.id} <ExternalLink size={12} aria-hidden="true" /></a></dd></div>
			<div><dt>Workflow</dt><dd class="mono">{run.workflow}</dd></div>
			<div><dt>Attempt</dt><dd>{run.attempt}</dd></div>
			<div><dt>Run status</dt><dd><Badge tone={tones[run.conclusion ?? run.status] ?? 'neutral'}>{(run.conclusion ?? run.status).replaceAll('_', ' ')}</Badge></dd></div>
			<div class="session"><dt>Runner session</dt><dd class="mono">{run.session}</dd></div>
		</dl>
		{#if run.association === 'dispatched'}<p class="muted">This run was dispatched for the turn. The older record does not identify which session executed it.</p>{/if}
		<h3>Jobs</h3>
		<p class="muted">Job durations cover the whole runner session, which may serve several turns.</p>
		{#if run.jobs === null}
			<EmptyState title="Job details unavailable" text="The run was found, but its jobs could not be loaded from GitHub." />
		{:else if run.jobs.length}
			<DataTable label="Jobs">
				<thead><tr><th>Job</th><th>Status</th><th>Runner</th><th class="r">Duration</th></tr></thead>
				<tbody>
					{#each run.jobs as job (job.id)}
						<tr>
							<td><a href={job.url} target="_blank" rel="noreferrer">{job.name}</a></td>
							<td><Badge tone={tones[job.conclusion ?? job.status] ?? 'neutral'}>{(job.conclusion ?? job.status).replaceAll('_', ' ')}</Badge></td>
							<td>{job.runner ?? 'Not assigned'}{#if job.labels.length}<div class="muted">{job.labels.join(', ')}</div>{/if}</td>
							<td class="r">{job.durationS === null ? 'Unavailable' : job.durationS === 0 ? '0s' : duration(job.durationS * 1000)}</td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		{:else}
			<EmptyState title="No jobs listed" text="GitHub returned an empty jobs list for this run attempt." />
		{/if}
	{/each}
{:catch error}
	<ErrorState {error} />
{/await}

<style>
	.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--s-4); }
	dt { color: var(--text-3); font-size: var(--fs-xs); }
	dd { margin: 0; overflow-wrap: anywhere; }
	.session { grid-column: 1 / -1; }
	h3 { margin-top: var(--s-5); }
</style>
