<script lang="ts">
	import { HandCoins } from 'lucide-svelte';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import DataTable from '#lib/components/DataTable.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import Inline from '#lib/components/Inline.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Panel from '#lib/components/Panel.svelte';
	import Skeleton from '#lib/components/Skeleton.svelte';
	import TaskSignals from '#lib/components/TaskSignals.svelte';
	import { relTime, taskHref } from '#lib/format.ts';
	import { withBase } from '#lib/paths.ts';
	import { taskStageMeta } from '#lib/meta.ts';
	import type { Stage, Task } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const DONE: Stage[] = ['merged', 'closed', 'rejected'];
	const order = (t: Task) => (t.paused ? 0 : DONE.includes(t.stage) ? 2 : 1);
	const sorted = (tasks: Task[]) => [...tasks].sort((a, b) => order(a) - order(b) || b.updatedAt.localeCompare(a.updatedAt));
</script>

<svelte:head><title>My sponsorships · Concurro</title></svelte:head>

<PageHeader title="My sponsorships" subtitle="Tasks whose model calls are paid with your credentials." />

{#await data.result}
	<Panel title="Sponsored tasks"><Skeleton rows={6} /></Panel>
{:then tasks}
	{@const paused = tasks.filter((t) => t.paused)}
	{#if paused.length}
		<Alert tone="caution" title="{paused.length} sponsored {paused.length === 1 ? 'task is' : 'tasks are'} paused in awaiting_credentials">
			Work resumes after you fix the credential and run <code>/concurro resume</code> on the task.
			{#snippet actions()}<Button size="sm" href={withBase('/me/credentials')}>Open credentials</Button>{/snippet}
		</Alert>
	{/if}
	<Panel flush title="Sponsored tasks" meta={String(tasks.length)}>
		{#if tasks.length}
			<DataTable label="Sponsored tasks">
				<thead><tr><th>Task</th><th>Stage</th><th>State</th><th>Review</th><th class="r">Model calls</th><th class="r">Updated</th></tr></thead>
				<tbody>
					{#each sorted(tasks) as t (taskHref(t))}
						{@const b = t.budgets.modelCalls}
						<tr>
							<td class="title">
								<a href={taskHref(t)}><Inline text={t.title} /></a>
								<p class="sub mono">{t.owner}/{t.repo}#{t.issue}</p>
							</td>
							<td class="nowrap"><Badge meta={taskStageMeta(t)} /></td>
							<td class="state">
								{#if t.paused}
									<Badge plain tone="danger">Paused</Badge>
									<p class="sub">{t.pauseReason}</p>
								{:else if DONE.includes(t.stage)}
									<Badge plain tone="neutral">Finished</Badge>
								{:else}
									<Badge plain tone="success">Running on your credentials</Badge>
								{/if}
							</td>
							<td><TaskSignals task={t} /></td>
							<td class="r nowrap">
								<span class="calls">{b.used} / {b.max}</span>
								<span class="bar" aria-hidden="true"><span style:width="{(b.used / b.max) * 100}%"></span></span>
							</td>
							<td class="r nowrap muted">{relTime(t.updatedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		{:else}
			<EmptyState icon={HandCoins} title="You sponsor no tasks" text="Run /concurro sponsor on a task to pay for its model calls with your own credentials." />
		{/if}
	</Panel>
{:catch error}
	<ErrorState {error} />
{/await}

<style>
	.state {
		max-width: 300px;
	}
	.calls {
		display: block;
	}
	.bar {
		display: block;
		width: 72px;
		height: 4px;
		margin: 3px 0 0 auto;
		border-radius: var(--r-full);
		background: var(--surface-3);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--accent);
	}
	code {
		padding: 1px 4px;
		border-radius: var(--r-sm);
		background: var(--surface-3);
	}
</style>
